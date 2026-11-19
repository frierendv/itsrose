import {
	createPostgresAssetRegistry,
	type SqlExecutor,
} from "../src/adapter/postgres";
import type { AssetRecord } from "../src/types";

type Recorded = { text: string; values: readonly unknown[] };

/**
 * Answers every statement with one empty row, so a write's `RETURNING *` still
 * yields a row and the placeholder assertions run on the real statement.
 */
function createSqlStub(): { sql: SqlExecutor; calls: Recorded[] } {
	const calls: Recorded[] = [];
	const sql: SqlExecutor = {
		async query(text, values = []) {
			calls.push({ text, values });
			return { rows: [{}], rowCount: 1 };
		},
	};
	return { sql, calls };
}

/**
 * Every referenced placeholder must have a parameter and every parameter must
 * be referenced; Postgres rejects an unused parameter it cannot type.
 */
function assertPlaceholdersMatch(text: string, values: readonly unknown[]) {
	const referenced = new Set(
		[...text.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]))
	);
	const max = Math.max(0, ...referenced);
	expect(max).toBe(values.length);
	for (let index = 1; index <= max; index += 1) {
		expect(referenced.has(index)).toBe(true);
	}
}

const record: AssetRecord = {
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

describe("asset registry SQL parameters", () => {
	it("insert binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();

		await createPostgresAssetRegistry(sql).insert(record);

		const call = calls[0];
		expect(call).toBeTruthy();
		assertPlaceholdersMatch(call!.text, call!.values);
	});

	it("findById binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();

		await createPostgresAssetRegistry(sql).findById("asset-1");

		const call = calls[0];
		expect(call).toBeTruthy();
		assertPlaceholdersMatch(call!.text, call!.values);
	});

	it("listForUser binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();

		await createPostgresAssetRegistry(sql).listForUser("user-1", {
			limit: 25,
			offset: 50,
		});

		const call = calls[0];
		expect(call).toBeTruthy();
		assertPlaceholdersMatch(call!.text, call!.values);
	});

	it("softDelete binds every placeholder", async () => {
		const { sql, calls } = createSqlStub();

		await createPostgresAssetRegistry(sql).softDelete(
			"asset-1",
			new Date("2026-11-19T06:00:00.000Z")
		);

		const call = calls[0];
		expect(call).toBeTruthy();
		assertPlaceholdersMatch(call!.text, call!.values);
	});

	it("sumUsage binds its tenant parameter", async () => {
		const { sql, calls } = createSqlStub();

		await createPostgresAssetRegistry(sql).sumUsage("tenant-1");

		const call = calls[0];
		expect(call).toBeTruthy();
		expect(call!.text).toContain("WHERE tenant_id = $1");
		expect(call!.values).toEqual(["tenant-1"]);
		assertPlaceholdersMatch(call!.text, call!.values);
	});
});
