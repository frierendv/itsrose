import type { BetterAuthPlugin, BetterAuthPluginDBSchema } from "better-auth";

/**
 * Plugin id used for the schema-only registration in `@itsrose/auth`.
 *
 * The transport plugin (`storagePlugin`) never declares the registry table, so
 * `db:generate` would not see it. Registering the schema through a separate,
 * endpoint-free plugin in the auth composition root keeps the generated SQL
 * the single source of truth for DDL.
 */
export const STORAGE_SCHEMA_PLUGIN_ID = "storage-schema";

/**
 * Table that describes durable assets.
 */
export const ASSET_REGISTRY_TABLE = "asset_registry";

/**
 * Better Auth database schema for the durable asset registry.
 *
 * One row describes one durable asset: the row, not the object key, is what
 * grants ownership. `id` is intentionally absent — Better Auth adds its own
 * primary key to every table and the adapter supplies it on insert — while
 * `asset_id` is the application identity, chosen before the object key is
 * built, so it carries its own unique index.
 */
export const storageSchema = {
	[ASSET_REGISTRY_TABLE]: {
		modelName: ASSET_REGISTRY_TABLE,
		fields: {
			/** Application identity of the asset, unique per row. */
			asset_id: { type: "string", required: true },
			user_id: { type: "string", required: true },
			/**
			 * Recorded beside `user_id`: the object key is user-scoped, but the
			 * storage cap is summed per tenant, so the row carries both.
			 */
			tenant_id: { type: "string", required: true },
			/** Asset kind, resolved to a storage policy by the caller. */
			kind: { type: "string", required: true },
			/** Durable object key under the `assets/` root. */
			key: { type: "string", required: true },
			filename: { type: "string", required: true },
			/** Object size in bytes; `bigint`, because assets exceed `integer`. */
			size_bytes: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			content_type: { type: "string", required: true },
			/** `ready` once the object and its row both exist. */
			status: {
				type: "string",
				required: true,
				defaultValue: "ready",
			},
			created_at: { type: "date", required: true },
			/** Soft delete marker; the row stays as the tombstone. */
			deleted_at: { type: "date", required: false },
		},
		indexes: [
			{
				name: "asset_registry_asset_id_uniq",
				fields: ["asset_id"],
				unique: true,
			},
			{
				name: "asset_registry_key_uniq",
				fields: ["key"],
				unique: true,
			},
			{ name: "asset_registry_user_id_idx", fields: ["user_id"] },
			{ name: "asset_registry_tenant_id_idx", fields: ["tenant_id"] },
			{ name: "asset_registry_kind_idx", fields: ["kind"] },
		],
	},
} satisfies BetterAuthPluginDBSchema;

/**
 * Schema-only Better Auth plugin, registered by `@itsrose/auth`.
 *
 * The transport plugin is registered by the host application, which means
 * `db:generate` (driven by the auth composition root) would never see the
 * registry table. This plugin carries the schema alone, and declaring it only
 * once avoids merging the same table definition twice.
 */
export const storageSchemaPlugin = {
	id: STORAGE_SCHEMA_PLUGIN_ID,
	schema: storageSchema,
	endpoints: {},
} satisfies BetterAuthPlugin;
