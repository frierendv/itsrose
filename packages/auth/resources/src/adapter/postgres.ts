import { randomUUID } from "node:crypto";
import { PROVIDER_RESOURCES_TABLE } from "../schema";
import type {
	ProviderResource,
	ProviderResourceKind,
	ProviderResourceListOptions,
	ProviderResourceRegistryPort,
} from "../types";

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
 * application passes its existing pool (`fastify.database`), the same shape
 * `@itsrose/auth-storage/registry` and `@itsrose/auth-usage/registry` accept.
 */
export interface SqlExecutor {
	query(text: string, values?: readonly unknown[]): Promise<SqlQueryResult>;
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

/**
 * Every column the adapter reads and writes, in insert order.
 *
 * `id` is deliberately absent: Better Auth owns that primary key, and the
 * adapter supplies it separately on insert.
 */
const PROVIDER_RESOURCE_COLUMNS = [
	"resource_id",
	"provider",
	"provider_resource_id",
	"tenant_id",
	"user_id",
	"kind",
	"name",
	"sample_asset_id",
	"status",
	"created_at",
	"deleted_at",
] as const;

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

/**
 * Narrows a stored `kind` to the closed union.
 *
 * The union is extended in one place (`ProviderResourceKind`) before a new
 * kind is written, so a row the current code cannot interpret is a data error
 * rather than something to coerce silently.
 */
function toProviderResourceKind(value: unknown): ProviderResourceKind {
	if (value === "voice") {
		return "voice";
	}
	throw new Error(`Unsupported provider resource kind "${String(value)}".`);
}

function mapProviderResource(row: Record<string, unknown>): ProviderResource {
	return {
		resource_id: String(row.resource_id ?? ""),
		provider: String(row.provider ?? ""),
		provider_resource_id: String(row.provider_resource_id ?? ""),
		tenant_id: String(row.tenant_id ?? ""),
		user_id: String(row.user_id ?? ""),
		kind: toProviderResourceKind(row.kind),
		name: String(row.name ?? ""),
		sample_asset_id:
			typeof row.sample_asset_id === "string"
				? row.sample_asset_id
				: null,
		status: String(row.status ?? "active"),
		created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
		deleted_at: toIso(row.deleted_at),
	};
}

/* -------------------------------------------------------------------------- */
/*                              Registry adapter                              */
/* -------------------------------------------------------------------------- */

/**
 * Postgres adapter for the provider resource ledger.
 *
 * Every statement is parameterized and every read maps snake_case columns onto
 * {@link ProviderResource}. Deletion is a soft delete — the row is the source
 * of truth and stays behind as the tombstone — and every list filters
 * `deleted_at IS NULL`, so a deleted resource stops answering ownership
 * checks immediately.
 */
export function createPostgresProviderRegistry(
	sql: SqlExecutor
): ProviderResourceRegistryPort {
	return {
		async insert(record: ProviderResource): Promise<ProviderResource> {
			const values = [
				randomUUID(),
				record.resource_id,
				record.provider,
				record.provider_resource_id,
				record.tenant_id,
				record.user_id,
				record.kind,
				record.name,
				record.sample_asset_id,
				record.status,
				record.created_at,
				record.deleted_at ?? null,
			];
			const placeholders = values.map((_, index) => `$${index + 1}`);

			const result = await sql.query(
				`INSERT INTO ${PROVIDER_RESOURCES_TABLE}
					(id, ${PROVIDER_RESOURCE_COLUMNS.join(", ")})
				 VALUES (${placeholders.join(", ")})
				 RETURNING *`,
				values
			);

			const row = result.rows[0];
			if (!row) {
				throw new Error(
					`Failed to persist provider resource "${record.resource_id}".`
				);
			}

			return mapProviderResource(row);
		},

		async findById(resourceId: string): Promise<ProviderResource | null> {
			const result = await sql.query(
				`SELECT * FROM ${PROVIDER_RESOURCES_TABLE}
				 WHERE resource_id = $1
				 LIMIT 1`,
				[resourceId]
			);

			const row = result.rows[0];
			return row ? mapProviderResource(row) : null;
		},

		async findByProviderResourceId(
			provider: string,
			providerResourceId: string
		): Promise<ProviderResource | null> {
			const result = await sql.query(
				`SELECT * FROM ${PROVIDER_RESOURCES_TABLE}
				 WHERE provider = $1
				   AND provider_resource_id = $2
				   AND deleted_at IS NULL
				 LIMIT 1`,
				[provider, providerResourceId]
			);

			const row = result.rows[0];
			return row ? mapProviderResource(row) : null;
		},

		async listForUser(
			userId: string,
			options: ProviderResourceListOptions = {}
		): Promise<ProviderResource[]> {
			const filterKind = options.kind !== undefined;

			const result = await sql.query(
				`SELECT * FROM ${PROVIDER_RESOURCES_TABLE}
				 WHERE user_id = $1 AND deleted_at IS NULL${filterKind ? " AND kind = $2" : ""}
				 ORDER BY created_at DESC, resource_id ASC`,
				filterKind ? [userId, options.kind] : [userId]
			);

			return result.rows.map(mapProviderResource);
		},

		async softDelete(resourceId: string, at: Date): Promise<boolean> {
			const result = await sql.query(
				`UPDATE ${PROVIDER_RESOURCES_TABLE}
				 SET deleted_at = $2
				 WHERE resource_id = $1 AND deleted_at IS NULL`,
				[resourceId, at]
			);

			return (result.rowCount ?? 0) > 0;
		},
	};
}
