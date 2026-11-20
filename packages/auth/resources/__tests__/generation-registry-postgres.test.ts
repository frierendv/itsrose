import {
	createPostgresGenerationRegistry,
	type SqlExecutor,
} from "../src/adapter/postgres";
import type { Generation } from "../src/types";

type Row = Record<string, unknown>;

type Response = {
	rows?: Row[];
	rowCount?: number;
};

type RecordedCall = {
	text: string;
	values: readonly unknown[];
};

/**
 * Records every statement the adapter runs and answers from a queue of
 * responses, so the adapter is exercised without a database.
 */
function createSql(responses: Response[] = []) {
	const calls: RecordedCall[] = [];
	let index = 0;

	const sql: SqlExecutor = {
		async query(text, values = []) {
			calls.push({ text, values });
			const response = responses[index] ?? responses.at(-1) ?? {};
			index += 1;
			const rows = response.rows ?? [];
			return { rows, rowCount: response.rowCount ?? rows.length };
		},
	};

	return { sql, calls };
}

/** Collapses statement indentation so the golden SQL stays readable. */
function normalize(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

function recorded(calls: RecordedCall[], index = 0): RecordedCall {
	const call = calls[index];
	if (!call) {
		throw new Error(`Expected a SQL call at index ${index}.`);
	}
	return call;
}

const createdAt = new Date("2026-11-20T04:00:00.000Z");
const expiresAt = new Date("2026-11-21T04:00:00.000Z");

const generationRow: Row = {
	generation_id: "generation-1",
	tenant_id: "tenant-1",
	user_id: "user-1",
	feature: "text_to_speech",
	provider: "elevenlabs",
	provider_task_id: null,
	status: "succeeded",
	input_text: "Hello there",
	input_params: '{"voice_id":"voice-1"}',
	result_key: "t/users/user-1/generated/abc.mp3",
	result_content_type: "audio/mpeg",
	result_asset_id: null,
	expires_at: expiresAt,
	created_at: createdAt,
	deleted_at: null,
};

const liveGeneration: Generation = {
	generation_id: "generation-1",
	tenant_id: "tenant-1",
	user_id: "user-1",
	feature: "text_to_speech",
	provider: "elevenlabs",
	provider_task_id: null,
	status: "succeeded",
	input_text: "Hello there",
	input_params: '{"voice_id":"voice-1"}',
	result_key: "t/users/user-1/generated/abc.mp3",
	result_content_type: "audio/mpeg",
	result_asset_id: null,
	expires_at: expiresAt,
	created_at: createdAt,
	deleted_at: null,
};

const mappedGeneration = {
	...liveGeneration,
	expires_at: "2026-11-21T04:00:00.000Z",
	created_at: "2026-11-20T04:00:00.000Z",
};

describe("generation registry writes", () => {
	it("inserts one row and supplies the Better Auth primary key", async () => {
		const { sql, calls } = createSql([{ rows: [generationRow] }]);
		const registry = createPostgresGenerationRegistry(sql);

		const stored = await registry.insert(liveGeneration);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"INSERT INTO generations (id, generation_id, tenant_id, user_id, feature, provider, provider_task_id, status, input_text, input_params, result_key, result_content_type, result_asset_id, expires_at, created_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *"
		);
		expect(call.values).toHaveLength(16);
		expect(call.values[0]).toMatch(/^[0-9a-f-]{36}$/);
		expect(call.values.slice(1)).toEqual([
			"generation-1",
			"tenant-1",
			"user-1",
			"text_to_speech",
			"elevenlabs",
			null,
			"succeeded",
			"Hello there",
			'{"voice_id":"voice-1"}',
			"t/users/user-1/generated/abc.mp3",
			"audio/mpeg",
			null,
			expiresAt,
			createdAt,
			null,
		]);
		expect(stored).toEqual(mappedGeneration);
	});

	it("rejects an insert that returns no row", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresGenerationRegistry(sql);

		await expect(registry.insert(liveGeneration)).rejects.toThrow(
			'Failed to persist generation "generation-1".'
		);
	});
});

describe("generation registry reads", () => {
	it("reads one row by application id and maps its columns", async () => {
		const { sql, calls } = createSql([{ rows: [generationRow] }]);
		const registry = createPostgresGenerationRegistry(sql);

		const found = await registry.findById("generation-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM generations WHERE generation_id = $1 LIMIT 1"
		);
		expect(call.values).toEqual(["generation-1"]);
		expect(found).toEqual(mappedGeneration);
	});

	it("returns a soft-deleted row with its tombstone", async () => {
		const deletedAt = new Date("2026-11-20T05:00:00.000Z");
		const { sql } = createSql([
			{ rows: [{ ...generationRow, deleted_at: deletedAt }] },
		]);
		const registry = createPostgresGenerationRegistry(sql);

		const found = await registry.findById("generation-1");

		expect(found?.deleted_at).toBe("2026-11-20T05:00:00.000Z");
	});

	it("returns null when the row does not exist", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(await registry.findById("generation-1")).toBeNull();
	});

	it("lists a user's live rows with the page window, newest first", async () => {
		const { sql, calls } = createSql([
			{
				rows: [
					generationRow,
					{ ...generationRow, generation_id: "generation-2" },
				],
			},
		]);
		const registry = createPostgresGenerationRegistry(sql);

		const rows = await registry.listForUser("user-1", {
			limit: 20,
			offset: 0,
		});

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM generations WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC, generation_id ASC LIMIT $2 OFFSET $3"
		);
		expect(call.values).toEqual(["user-1", 20, 0]);
		expect(rows.map((row) => row.generation_id)).toEqual([
			"generation-1",
			"generation-2",
		]);
	});

	it("filters the list by feature when asked", async () => {
		const { sql, calls } = createSql([{ rows: [generationRow] }]);
		const registry = createPostgresGenerationRegistry(sql);

		await registry.listForUser("user-1", {
			feature: "music_compose",
			limit: 10,
			offset: 40,
		});

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM generations WHERE user_id = $1 AND deleted_at IS NULL AND feature = $2 ORDER BY created_at DESC, generation_id ASC LIMIT $3 OFFSET $4"
		);
		expect(call.values).toEqual(["user-1", "music_compose", 10, 40]);
	});

	it("defaults a missing status and maps absent optional columns to null", async () => {
		const { sql } = createSql([
			{
				rows: [
					{
						...generationRow,
						status: undefined,
						input_text: null,
						input_params: null,
						result_key: null,
						result_content_type: null,
						expires_at: null,
					},
				],
			},
		]);
		const registry = createPostgresGenerationRegistry(sql);

		const found = await registry.findById("generation-1");

		expect(found?.status).toBe("succeeded");
		expect(found?.input_text).toBeNull();
		expect(found?.input_params).toBeNull();
		expect(found?.result_key).toBeNull();
		expect(found?.result_content_type).toBeNull();
		expect(found?.expires_at).toBeNull();
	});

	it("rejects a row whose feature the closed union does not know", async () => {
		const { sql } = createSql([
			{ rows: [{ ...generationRow, feature: "voice_clone" }] },
		]);
		const registry = createPostgresGenerationRegistry(sql);

		await expect(registry.findById("generation-1")).rejects.toThrow(
			'Unsupported generation feature "voice_clone".'
		);
	});
});

describe("generation registry linking and deletion", () => {
	it("links a live row to its saved asset", async () => {
		const savedRow = {
			...generationRow,
			result_asset_id: "asset-1",
		};
		const { sql, calls } = createSql([{ rows: [savedRow] }]);
		const registry = createPostgresGenerationRegistry(sql);

		const updated = await registry.markSaved("generation-1", "asset-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"UPDATE generations SET result_asset_id = $2 WHERE generation_id = $1 AND deleted_at IS NULL RETURNING *"
		);
		expect(call.values).toEqual(["generation-1", "asset-1"]);
		expect(updated?.result_asset_id).toBe("asset-1");
	});

	it("returns null when no live row was linked", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(await registry.markSaved("generation-1", "asset-1")).toBeNull();
	});

	it("marks a live row deleted", async () => {
		const at = new Date("2026-11-20T06:00:00.000Z");
		const { sql, calls } = createSql([{ rowCount: 1 }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(await registry.softDelete("generation-1", at)).toBe(true);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"UPDATE generations SET deleted_at = $2 WHERE generation_id = $1 AND deleted_at IS NULL"
		);
		expect(call.values).toEqual(["generation-1", at]);
	});

	it("reports a repeated clear as a no-op", async () => {
		const { sql } = createSql([{ rowCount: 0 }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(
			await registry.softDelete(
				"generation-1",
				new Date("2026-11-20T06:00:00.000Z")
			)
		).toBe(false);
	});

	it("hard-deletes every row of a user for the account purge", async () => {
		const { sql, calls } = createSql([{ rowCount: 3 }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(await registry.deleteAllForUser("user-1")).toBe(3);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"DELETE FROM generations WHERE user_id = $1"
		);
		expect(call.values).toEqual(["user-1"]);
	});

	it("reports zero rows when the purge removed nothing", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresGenerationRegistry(sql);

		expect(await registry.deleteAllForUser("user-1")).toBe(0);
	});
});
