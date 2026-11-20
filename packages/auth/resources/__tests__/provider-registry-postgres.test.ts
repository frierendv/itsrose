import {
	createPostgresProviderRegistry,
	type SqlExecutor,
} from "../src/adapter/postgres";
import type { ProviderResource } from "../src/types";

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

const resourceRow: Row = {
	resource_id: "resource-1",
	provider: "elevenlabs",
	provider_resource_id: "voice-1",
	tenant_id: "tenant-1",
	user_id: "user-1",
	kind: "voice",
	name: "Narrator",
	sample_asset_id: "asset-1",
	status: "active",
	created_at: createdAt,
	deleted_at: null,
};

const liveRecord: ProviderResource = {
	resource_id: "resource-1",
	provider: "elevenlabs",
	provider_resource_id: "voice-1",
	tenant_id: "tenant-1",
	user_id: "user-1",
	kind: "voice",
	name: "Narrator",
	sample_asset_id: "asset-1",
	status: "active",
	created_at: createdAt,
	deleted_at: null,
};

describe("provider registry writes", () => {
	it("inserts one row and supplies the Better Auth primary key", async () => {
		const { sql, calls } = createSql([{ rows: [resourceRow] }]);
		const registry = createPostgresProviderRegistry(sql);

		const stored = await registry.insert(liveRecord);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"INSERT INTO provider_resources (id, resource_id, provider, provider_resource_id, tenant_id, user_id, kind, name, sample_asset_id, status, created_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *"
		);
		expect(call.values).toHaveLength(12);
		expect(call.values[0]).toMatch(/^[0-9a-f-]{36}$/);
		expect(call.values.slice(1)).toEqual([
			"resource-1",
			"elevenlabs",
			"voice-1",
			"tenant-1",
			"user-1",
			"voice",
			"Narrator",
			"asset-1",
			"active",
			createdAt,
			null,
		]);
		expect(stored).toEqual({
			...liveRecord,
			created_at: "2026-11-20T04:00:00.000Z",
		});
	});

	it("rejects an insert that returns no row", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresProviderRegistry(sql);

		await expect(registry.insert(liveRecord)).rejects.toThrow(
			'Failed to persist provider resource "resource-1".'
		);
	});
});

describe("provider registry reads", () => {
	it("reads one row by application id and maps its columns", async () => {
		const { sql, calls } = createSql([{ rows: [resourceRow] }]);
		const registry = createPostgresProviderRegistry(sql);

		const found = await registry.findById("resource-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM provider_resources WHERE resource_id = $1 LIMIT 1"
		);
		expect(call.values).toEqual(["resource-1"]);
		expect(found).toEqual({
			...liveRecord,
			created_at: "2026-11-20T04:00:00.000Z",
		});
	});

	it("returns a soft-deleted row with its tombstone", async () => {
		const deletedAt = new Date("2026-11-20T05:00:00.000Z");
		const { sql } = createSql([
			{ rows: [{ ...resourceRow, deleted_at: deletedAt }] },
		]);
		const registry = createPostgresProviderRegistry(sql);

		const found = await registry.findById("resource-1");

		expect(found?.deleted_at).toBe("2026-11-20T05:00:00.000Z");
	});

	it("returns null when the row does not exist", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresProviderRegistry(sql);

		expect(await registry.findById("resource-1")).toBeNull();
	});

	it("reads the live row for a provider id and excludes tombstones", async () => {
		const { sql, calls } = createSql([{ rows: [resourceRow] }]);
		const registry = createPostgresProviderRegistry(sql);

		const found = await registry.findByProviderResourceId(
			"elevenlabs",
			"voice-1"
		);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM provider_resources WHERE provider = $1 AND provider_resource_id = $2 AND deleted_at IS NULL LIMIT 1"
		);
		expect(call.values).toEqual(["elevenlabs", "voice-1"]);
		expect(found?.resource_id).toBe("resource-1");
	});

	it("returns null when no live row matches the provider id", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresProviderRegistry(sql);

		expect(
			await registry.findByProviderResourceId("elevenlabs", "voice-1")
		).toBeNull();
	});

	it("lists a user's live rows only, newest first", async () => {
		const { sql, calls } = createSql([
			{
				rows: [
					resourceRow,
					{ ...resourceRow, resource_id: "resource-2" },
				],
			},
		]);
		const registry = createPostgresProviderRegistry(sql);

		const rows = await registry.listForUser("user-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM provider_resources WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC, resource_id ASC"
		);
		expect(call.values).toEqual(["user-1"]);
		expect(rows.map((row) => row.resource_id)).toEqual([
			"resource-1",
			"resource-2",
		]);
	});

	it("filters the list by kind when asked", async () => {
		const { sql, calls } = createSql([{ rows: [resourceRow] }]);
		const registry = createPostgresProviderRegistry(sql);

		await registry.listForUser("user-1", { kind: "voice" });

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM provider_resources WHERE user_id = $1 AND deleted_at IS NULL AND kind = $2 ORDER BY created_at DESC, resource_id ASC"
		);
		expect(call.values).toEqual(["user-1", "voice"]);
	});

	it("defaults a missing status and maps a null sample asset", async () => {
		const { sql } = createSql([
			{
				rows: [
					{
						...resourceRow,
						sample_asset_id: null,
						status: undefined,
					},
				],
			},
		]);
		const registry = createPostgresProviderRegistry(sql);

		const found = await registry.findById("resource-1");

		expect(found?.status).toBe("active");
		expect(found?.sample_asset_id).toBeNull();
	});

	it("rejects a row whose kind the closed union does not know", async () => {
		const { sql } = createSql([
			{ rows: [{ ...resourceRow, kind: "avatar" }] },
		]);
		const registry = createPostgresProviderRegistry(sql);

		await expect(registry.findById("resource-1")).rejects.toThrow(
			'Unsupported provider resource kind "avatar".'
		);
	});
});

describe("provider registry deletion", () => {
	it("marks a live row deleted", async () => {
		const at = new Date("2026-11-20T06:00:00.000Z");
		const { sql, calls } = createSql([{ rowCount: 1 }]);
		const registry = createPostgresProviderRegistry(sql);

		expect(await registry.softDelete("resource-1", at)).toBe(true);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"UPDATE provider_resources SET deleted_at = $2 WHERE resource_id = $1 AND deleted_at IS NULL"
		);
		expect(call.values).toEqual(["resource-1", at]);
	});

	it("reports a repeated delete as a no-op", async () => {
		const { sql } = createSql([{ rowCount: 0 }]);
		const registry = createPostgresProviderRegistry(sql);

		expect(
			await registry.softDelete(
				"resource-1",
				new Date("2026-11-20T06:00:00.000Z")
			)
		).toBe(false);
	});
});
