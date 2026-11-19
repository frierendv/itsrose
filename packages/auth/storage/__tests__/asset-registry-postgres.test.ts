import {
	createPostgresAssetRegistry,
	type SqlExecutor,
} from "../src/adapter/postgres";
import type { AssetRecord } from "../src/types";

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

const assetRow: Row = {
	asset_id: "asset-1",
	user_id: "user-1",
	tenant_id: "tenant-1",
	kind: "voice_sample",
	key: "assets/users/user-1/voice_sample/asset-1/sample.wav",
	filename: "sample.wav",
	size_bytes: "2048",
	content_type: "audio/wav",
	status: "ready",
	created_at: new Date("2026-11-19T04:00:00.000Z"),
	deleted_at: null,
};

const liveRecord: AssetRecord = {
	asset_id: "asset-1",
	user_id: "user-1",
	tenant_id: "tenant-1",
	kind: "voice_sample",
	key: "assets/users/user-1/voice_sample/asset-1/sample.wav",
	filename: "sample.wav",
	size_bytes: 2048,
	content_type: "audio/wav",
	status: "ready",
	created_at: new Date("2026-11-19T04:00:00.000Z"),
	deleted_at: null,
};

describe("asset registry writes", () => {
	it("inserts one row and supplies the primary key", async () => {
		const { sql, calls } = createSql([{ rows: [assetRow] }]);
		const registry = createPostgresAssetRegistry(sql);

		const stored = await registry.insert(liveRecord);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"INSERT INTO asset_registry (id, asset_id, user_id, tenant_id, kind, key, filename, size_bytes, content_type, status, created_at, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *"
		);
		expect(call.values).toHaveLength(12);
		expect(call.values[0]).toMatch(/^[0-9a-f-]{36}$/);
		expect(call.values.slice(1)).toEqual([
			"asset-1",
			"user-1",
			"tenant-1",
			"voice_sample",
			"assets/users/user-1/voice_sample/asset-1/sample.wav",
			"sample.wav",
			2048,
			"audio/wav",
			"ready",
			liveRecord.created_at,
			null,
		]);
		expect(stored).toEqual({
			...liveRecord,
			created_at: "2026-11-19T04:00:00.000Z",
		});
	});

	it("rejects an insert that returns no row", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresAssetRegistry(sql);

		await expect(registry.insert(liveRecord)).rejects.toThrow(
			'Failed to persist asset "asset-1".'
		);
	});
});

describe("asset registry reads", () => {
	it("reads one row by asset id and maps its columns", async () => {
		const { sql, calls } = createSql([{ rows: [assetRow] }]);
		const registry = createPostgresAssetRegistry(sql);

		const found = await registry.findById("asset-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM asset_registry WHERE asset_id = $1 LIMIT 1"
		);
		expect(call.values).toEqual(["asset-1"]);
		expect(found).toEqual({
			...liveRecord,
			created_at: "2026-11-19T04:00:00.000Z",
		});
	});

	it("returns a soft-deleted row with its tombstone", async () => {
		const deletedAt = new Date("2026-11-19T05:00:00.000Z");
		const { sql } = createSql([
			{ rows: [{ ...assetRow, deleted_at: deletedAt }] },
		]);
		const registry = createPostgresAssetRegistry(sql);

		const found = await registry.findById("asset-1");

		expect(found?.deleted_at).toBe("2026-11-19T05:00:00.000Z");
	});

	it("returns null when the row does not exist", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresAssetRegistry(sql);

		expect(await registry.findById("asset-1")).toBeNull();
	});

	it("lists a user's live rows only, newest first", async () => {
		const { sql, calls } = createSql([
			{ rows: [assetRow, { ...assetRow, asset_id: "asset-2" }] },
		]);
		const registry = createPostgresAssetRegistry(sql);

		const rows = await registry.listForUser("user-1", {
			limit: 25,
			offset: 50,
		});

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT * FROM asset_registry WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC, asset_id ASC LIMIT $2 OFFSET $3"
		);
		expect(call.values).toEqual(["user-1", 25, 50]);
		expect(rows.map((row) => row.asset_id)).toEqual(["asset-1", "asset-2"]);
	});

	it("clamps the page window to a usable range", async () => {
		const { sql, calls } = createSql([{ rows: [] }]);
		const registry = createPostgresAssetRegistry(sql);

		await registry.listForUser("user-1", { limit: 0, offset: -10 });
		expect(recorded(calls, 0).values).toEqual(["user-1", 1, 0]);

		await registry.listForUser("user-1", {
			limit: Number.POSITIVE_INFINITY,
			offset: Number.NaN,
		});
		expect(recorded(calls, 1).values).toEqual(["user-1", 50, 0]);

		await registry.listForUser("user-1", { limit: 1_000, offset: 2.9 });
		expect(recorded(calls, 2).values).toEqual(["user-1", 200, 2]);
	});
});

describe("asset registry deletion and usage", () => {
	it("marks a live row deleted", async () => {
		const at = new Date("2026-11-19T06:00:00.000Z");
		const { sql, calls } = createSql([{ rowCount: 1 }]);
		const registry = createPostgresAssetRegistry(sql);

		expect(await registry.softDelete("asset-1", at)).toBe(true);

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"UPDATE asset_registry SET deleted_at = $2 WHERE asset_id = $1 AND deleted_at IS NULL"
		);
		expect(call.values).toEqual(["asset-1", at]);
	});

	it("reports a repeated delete as a no-op", async () => {
		const { sql } = createSql([{ rowCount: 0 }]);
		const registry = createPostgresAssetRegistry(sql);

		expect(
			await registry.softDelete(
				"asset-1",
				new Date("2026-11-19T06:00:00.000Z")
			)
		).toBe(false);
	});

	it("sums live bytes and count for one tenant", async () => {
		const { sql, calls } = createSql([
			{ rows: [{ bytes: "1234", assets: 3 }] },
		]);
		const registry = createPostgresAssetRegistry(sql);

		const usage = await registry.sumUsage("tenant-1");

		const call = recorded(calls);
		expect(normalize(call.text)).toBe(
			"SELECT COALESCE(SUM(size_bytes), 0) AS bytes, COUNT(*) AS assets FROM asset_registry WHERE tenant_id = $1 AND deleted_at IS NULL"
		);
		expect(call.values).toEqual(["tenant-1"]);
		expect(usage).toEqual({ bytes: 1234, assets: 3 });
	});

	it("maps bigint counters", async () => {
		const { sql } = createSql([
			{ rows: [{ bytes: 5_000_000_000n, assets: "2" }] },
		]);
		const registry = createPostgresAssetRegistry(sql);

		expect(await registry.sumUsage("tenant-1")).toEqual({
			bytes: 5_000_000_000,
			assets: 2,
		});
	});

	it("returns zero usage when the tenant owns no rows", async () => {
		const { sql } = createSql([{ rows: [] }]);
		const registry = createPostgresAssetRegistry(sql);

		expect(await registry.sumUsage("tenant-1")).toEqual({
			bytes: 0,
			assets: 0,
		});
	});

	it("treats an empty aggregate row as zero", async () => {
		const { sql } = createSql([{ rows: [{ bytes: null, assets: null }] }]);
		const registry = createPostgresAssetRegistry(sql);

		expect(await registry.sumUsage("tenant-1")).toEqual({
			bytes: 0,
			assets: 0,
		});
	});
});
