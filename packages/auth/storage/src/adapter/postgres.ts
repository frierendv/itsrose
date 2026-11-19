import { randomUUID } from "node:crypto";
import { ASSET_REGISTRY_TABLE } from "../schema";
import type { AssetRecord, AssetRegistryPort, AssetUsage } from "../types";

/* -------------------------------------------------------------------------- */
/*                          Structural SQL surface                            */
/* -------------------------------------------------------------------------- */

export type SqlQueryResult = {
	rows: Array<Record<string, unknown>>;
	rowCount?: number | null;
};

/**
 * Minimal SQL surface used by the adapter.
 *
 * Declared structurally so the package never imports `pg`; the host
 * application passes its existing pool (`fastify.database`).
 */
export interface SqlExecutor {
	query(text: string, values?: readonly unknown[]): Promise<SqlQueryResult>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/** Page size used when the caller passes a non-finite `limit`. */
const DEFAULT_LIST_LIMIT = 50;

/** Upper bound on one page, so a caller cannot ask for the whole library. */
const MAX_LIST_LIMIT = 200;

/**
 * Every column the adapter reads and writes, in insert order.
 *
 * `id` is deliberately absent: Better Auth owns that primary key, and the
 * adapter supplies it separately on insert.
 */
const ASSET_COLUMNS = [
	"asset_id",
	"user_id",
	"tenant_id",
	"kind",
	"key",
	"filename",
	"size_bytes",
	"content_type",
	"status",
	"created_at",
	"deleted_at",
] as const;

function toNumber(value: unknown, fallback = 0): number {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : fallback;
	}
	if (typeof value === "bigint") {
		return Number(value);
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function toIso(value: unknown): string | null {
	if (!value) {
		return null;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === "string") {
		return value;
	}
	return null;
}

function clampLimit(limit: number): number {
	if (!Number.isFinite(limit)) {
		return DEFAULT_LIST_LIMIT;
	}
	return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIST_LIMIT);
}

function clampOffset(offset: number): number {
	if (!Number.isFinite(offset)) {
		return 0;
	}
	return Math.max(Math.trunc(offset), 0);
}

function mapAsset(row: Record<string, unknown>): AssetRecord {
	return {
		asset_id: String(row.asset_id ?? ""),
		user_id: String(row.user_id ?? ""),
		tenant_id: String(row.tenant_id ?? ""),
		kind: String(row.kind ?? ""),
		key: String(row.key ?? ""),
		filename: String(row.filename ?? ""),
		size_bytes: toNumber(row.size_bytes),
		content_type: String(row.content_type ?? ""),
		status: String(row.status ?? "ready"),
		created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
		deleted_at: toIso(row.deleted_at),
	};
}

/* -------------------------------------------------------------------------- */
/*                              Registry adapter                              */
/* -------------------------------------------------------------------------- */

/**
 * Postgres adapter for the durable asset registry.
 *
 * Every statement is parameterized and every read maps snake_case columns onto
 * {@link AssetRecord}. Deletion is a soft delete — the row is the source of
 * truth and stays behind as the tombstone — and usage counts only live rows,
 * so a deleted asset stops counting immediately.
 */
export function createPostgresAssetRegistry(
	sql: SqlExecutor
): AssetRegistryPort {
	return {
		async insert(record: AssetRecord): Promise<AssetRecord> {
			const values = [
				randomUUID(),
				record.asset_id,
				record.user_id,
				record.tenant_id,
				record.kind,
				record.key,
				record.filename,
				record.size_bytes,
				record.content_type,
				record.status,
				record.created_at,
				record.deleted_at ?? null,
			];
			const placeholders = values.map((_, index) => `$${index + 1}`);

			const result = await sql.query(
				`INSERT INTO ${ASSET_REGISTRY_TABLE}
					(id, ${ASSET_COLUMNS.join(", ")})
				 VALUES (${placeholders.join(", ")})
				 RETURNING *`,
				values
			);

			const row = result.rows[0];
			if (!row) {
				throw new Error(
					`Failed to persist asset "${record.asset_id}".`
				);
			}

			return mapAsset(row);
		},

		async findById(assetId: string): Promise<AssetRecord | null> {
			const result = await sql.query(
				`SELECT * FROM ${ASSET_REGISTRY_TABLE}
				 WHERE asset_id = $1
				 LIMIT 1`,
				[assetId]
			);

			const row = result.rows[0];
			return row ? mapAsset(row) : null;
		},

		async listForUser(userId: string, options): Promise<AssetRecord[]> {
			const result = await sql.query(
				`SELECT * FROM ${ASSET_REGISTRY_TABLE}
				 WHERE user_id = $1 AND deleted_at IS NULL
				 ORDER BY created_at DESC, asset_id ASC
				 LIMIT $2 OFFSET $3`,
				[userId, clampLimit(options.limit), clampOffset(options.offset)]
			);

			return result.rows.map(mapAsset);
		},

		async softDelete(assetId: string, at: Date): Promise<boolean> {
			const result = await sql.query(
				`UPDATE ${ASSET_REGISTRY_TABLE}
				 SET deleted_at = $2
				 WHERE asset_id = $1 AND deleted_at IS NULL`,
				[assetId, at]
			);

			return (result.rowCount ?? 0) > 0;
		},

		async sumUsage(tenantId: string): Promise<AssetUsage> {
			const result = await sql.query(
				`SELECT COALESCE(SUM(size_bytes), 0) AS bytes,
					COUNT(*) AS assets
				 FROM ${ASSET_REGISTRY_TABLE}
				 WHERE tenant_id = $1 AND deleted_at IS NULL`,
				[tenantId]
			);

			const row = result.rows[0];
			if (!row) {
				return { bytes: 0, assets: 0 };
			}

			return {
				bytes: toNumber(row.bytes),
				assets: toNumber(row.assets),
			};
		},
	};
}
