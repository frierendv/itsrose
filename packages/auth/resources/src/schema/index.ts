import type { BetterAuthPlugin, BetterAuthPluginDBSchema } from "better-auth";

/**
 * Plugin id used for the schema-only registration in `@itsrose/auth`.
 *
 * The resources package has no transport plugin: the host application composes
 * its own routes and passes the ports they need. Registering the ledger schema
 * through a separate, endpoint-free plugin in the auth composition root keeps
 * the generated SQL the single source of truth for DDL.
 */
export const RESOURCES_SCHEMA_PLUGIN_ID = "resources-schema";

/**
 * Table that records the upstream provider resources a user owns.
 */
export const PROVIDER_RESOURCES_TABLE = "provider_resources";

/**
 * Better Auth database schema for the provider resource ledger.
 *
 * The row — not the upstream id list — is what grants ownership. Every voice
 * an ElevenLabs clone creates lives in one platform account behind one API
 * key, so `GET /v2/voices` cannot say whose clone is whose; holding a
 * `voice_id` is not a capability on our side, because every caller of the
 * shared key already has it. Only a row can be scoped by `user_id`, survive
 * the upstream object it describes, and be the thing account deletion purges.
 *
 * `id` is intentionally absent — Better Auth adds its own primary key to
 * every table and the adapter supplies it on insert — while `resource_id` is
 * the application identity the dashboard and studio routes address, so it
 * carries its own unique index. The composite unique index on
 * `(provider, provider_resource_id)` is the lookup duplicate ownership and
 * synthesis checks use: an upstream id is unique per provider account, and v1
 * records voices from one account only.
 */
export const providerResourcesSchema = {
	[PROVIDER_RESOURCES_TABLE]: {
		modelName: PROVIDER_RESOURCES_TABLE,
		fields: {
			/** Application identity of the resource, unique per row. */
			resource_id: { type: "string", required: true },
			/** Upstream provider, `elevenlabs` first. */
			provider: { type: "string", required: true },
			/** The upstream id: `voice_id` for kind `voice`. */
			provider_resource_id: { type: "string", required: true },
			/**
			 * Recorded beside `user_id` for the same reason the asset registry
			 * does it: the object is user-scoped, but caps and analytics are
			 * tenant-wide.
			 */
			tenant_id: { type: "string", required: true },
			/** The owner. The only field enforcement reads. */
			user_id: { type: "string", required: true },
			/**
			 * Closed enum owned by the studio package; `voice` is the first and
			 * only member in v1. A future kind is added here before use.
			 */
			kind: { type: "string", required: true },
			/** The user-chosen display name as given to the provider. */
			name: { type: "string", required: true },
			/**
			 * The durable asset the clone was made from. Nullable in the schema;
			 * the application requires it for `voice`.
			 */
			sample_asset_id: { type: "string", required: false },
			/** `active` while the upstream object exists. */
			status: {
				type: "string",
				required: true,
				defaultValue: "active",
			},
			created_at: { type: "date", required: true },
			/** Soft delete marker; set only after the upstream delete succeeds. */
			deleted_at: { type: "date", required: false },
		},
		indexes: [
			{
				name: "provider_resources_resource_id_uniq",
				fields: ["resource_id"],
				unique: true,
			},
			{
				name: "provider_resources_provider_resource_uniq",
				fields: ["provider", "provider_resource_id"],
				unique: true,
			},
			{ name: "provider_resources_user_id_idx", fields: ["user_id"] },
			{
				name: "provider_resources_tenant_id_idx",
				fields: ["tenant_id"],
			},
			{ name: "provider_resources_kind_idx", fields: ["kind"] },
		],
	},
} satisfies BetterAuthPluginDBSchema;

/**
 * Schema-only Better Auth plugin, registered by `@itsrose/auth`.
 *
 * The studio routes are composed by the host application, so `db:generate`
 * (driven by the auth composition root) would never see the ledger table.
 * This plugin carries the schema alone, and declaring it only once avoids
 * merging the same table definition twice.
 */
export const providerResourcesSchemaPlugin = {
	id: RESOURCES_SCHEMA_PLUGIN_ID,
	schema: providerResourcesSchema,
	endpoints: {},
} satisfies BetterAuthPlugin;
