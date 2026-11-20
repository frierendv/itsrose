import { randomUUID } from "node:crypto";
import { GENERATIONS_TABLE, PROVIDER_RESOURCES_TABLE } from "../schema";
import type {
	Generation,
	GenerationFeature,
	GenerationListOptions,
	GenerationRegistryPort,
	ProviderResource,
	ProviderResourceKind,
	ProviderResourceListOptions,
	ProviderResourceRegistryPort,
} from "../types";
import { isGenerationFeature } from "../types";

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

/* -------------------------------------------------------------------------- */
/*                          Generation registry adapter                       */
/* -------------------------------------------------------------------------- */

/**
 * Every column the generation adapter reads and writes, in insert order.
 *
 * `id` is deliberately absent: Better Auth owns that primary key, and the
 * adapter supplies it separately on insert.
 */
const GENERATION_COLUMNS = [
	"generation_id",
	"tenant_id",
	"user_id",
	"feature",
	"provider",
	"provider_task_id",
	"status",
	"input_text",
	"input_params",
	"result_key",
	"result_content_type",
	"result_asset_id",
	"expires_at",
	"created_at",
	"deleted_at",
] as const;

function toNullableString(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

/**
 * Narrows a stored `feature` to the closed union.
 *
 * The union is extended in one place (`GENERATION_FEATURES`) before a new
 * feature is written, so a row the current code cannot interpret is a data
 * error rather than something to coerce silently.
 */
function toGenerationFeature(value: unknown): GenerationFeature {
	if (typeof value === "string" && isGenerationFeature(value)) {
		return value;
	}
	throw new Error(`Unsupported generation feature "${String(value)}".`);
}

function mapGeneration(row: Record<string, unknown>): Generation {
	return {
		generation_id: String(row.generation_id ?? ""),
		tenant_id: String(row.tenant_id ?? ""),
		user_id: String(row.user_id ?? ""),
		feature: toGenerationFeature(row.feature),
		provider: String(row.provider ?? ""),
		provider_task_id: toNullableString(row.provider_task_id),
		status: String(row.status ?? "succeeded"),
		input_text: toNullableString(row.input_text),
		input_params: toNullableString(row.input_params),
		result_key: toNullableString(row.result_key),
		result_content_type: toNullableString(row.result_content_type),
		result_asset_id: toNullableString(row.result_asset_id),
		expires_at: toIso(row.expires_at),
		created_at: toIso(row.created_at) ?? new Date(0).toISOString(),
		deleted_at: toIso(row.deleted_at),
	};
}

/**
 * Postgres adapter for the generation ledger.
 *
 * Every statement is parameterized and every read maps snake_case columns onto
 * {@link Generation}. History is soft-deleted — the row stays as the
 * tombstone, and every list filters `deleted_at IS NULL` — while account
 * deletion hard-deletes a user's rows, because a history row is a ledger, not
 * a durable record that has to outlive the account.
 */
export function createPostgresGenerationRegistry(
	sql: SqlExecutor
): GenerationRegistryPort {
	return {
		async insert(record: Generation): Promise<Generation> {
			const values = [
				randomUUID(),
				record.generation_id,
				record.tenant_id,
				record.user_id,
				record.feature,
				record.provider,
				record.provider_task_id,
				record.status,
				record.input_text,
				record.input_params,
				record.result_key,
				record.result_content_type,
				record.result_asset_id,
				record.expires_at ?? null,
				record.created_at,
				record.deleted_at ?? null,
			];
			const placeholders = values.map((_, index) => `$${index + 1}`);

			const result = await sql.query(
				`INSERT INTO ${GENERATIONS_TABLE}
					(id, ${GENERATION_COLUMNS.join(", ")})
				 VALUES (${placeholders.join(", ")})
				 RETURNING *`,
				values
			);

			const row = result.rows[0];
			if (!row) {
				throw new Error(
					`Failed to persist generation "${record.generation_id}".`
				);
			}

			return mapGeneration(row);
		},

		async findById(generationId: string): Promise<Generation | null> {
			const result = await sql.query(
				`SELECT * FROM ${GENERATIONS_TABLE}
				 WHERE generation_id = $1
				 LIMIT 1`,
				[generationId]
			);

			const row = result.rows[0];
			return row ? mapGeneration(row) : null;
		},

		async listForUser(
			userId: string,
			options: GenerationListOptions
		): Promise<Generation[]> {
			const filterFeature = options.feature !== undefined;
			const values: unknown[] = [userId];

			if (filterFeature) {
				values.push(options.feature);
			}

			const limitIndex = values.length + 1;
			const offsetIndex = limitIndex + 1;
			values.push(options.limit, options.offset);

			const result = await sql.query(
				`SELECT * FROM ${GENERATIONS_TABLE}
				 WHERE user_id = $1 AND deleted_at IS NULL${filterFeature ? " AND feature = $2" : ""}
				 ORDER BY created_at DESC, generation_id ASC
				 LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
				values
			);

			return result.rows.map(mapGeneration);
		},

		async markSaved(
			generationId: string,
			assetId: string
		): Promise<Generation | null> {
			const result = await sql.query(
				`UPDATE ${GENERATIONS_TABLE}
				 SET result_asset_id = $2
				 WHERE generation_id = $1 AND deleted_at IS NULL
				 RETURNING *`,
				[generationId, assetId]
			);

			const row = result.rows[0];
			return row ? mapGeneration(row) : null;
		},

		async softDelete(generationId: string, at: Date): Promise<boolean> {
			const result = await sql.query(
				`UPDATE ${GENERATIONS_TABLE}
				 SET deleted_at = $2
				 WHERE generation_id = $1 AND deleted_at IS NULL`,
				[generationId, at]
			);

			return (result.rowCount ?? 0) > 0;
		},

		async deleteAllForUser(userId: string): Promise<number> {
			const result = await sql.query(
				`DELETE FROM ${GENERATIONS_TABLE} WHERE user_id = $1`,
				[userId]
			);

			return result.rowCount ?? 0;
		},
	};
}
