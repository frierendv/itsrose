import type { BetterAuthPlugin, BetterAuthPluginDBSchema } from "better-auth";
import {
	USAGE_DAILY_ROLLUPS_TABLE,
	USAGE_ENDPOINT_WEIGHTS_TABLE,
	USAGE_RATE_AUDIT_TABLE,
	USAGE_SCHEMA_PLUGIN_ID,
	USAGE_SETTLEMENTS_TABLE,
	USAGE_UNIT_RATES_TABLE,
} from "../constants";

/**
 * Better Auth database schema for the usage ledger.
 *
 * Registered through the schema-only plugin (`usageSchemaPlugin`) in
 * `@itsrose/auth` so `db:generate` / `db:migrate` remain the single source of
 * truth for DDL. Every `number` column is an integer (Better Auth never emits
 * `numeric`), hence the micro-unit scale on `units_micro` / `weight_micro`.
 */
export const usageSchema = {
	[USAGE_DAILY_ROLLUPS_TABLE]: {
		modelName: USAGE_DAILY_ROLLUPS_TABLE,
		fields: {
			tenant_id: { type: "string", required: true },
			/** UTC day string, `YYYY-MM-DD`. */
			day: { type: "string", required: true },
			endpoint: { type: "string", required: true },
			/** Empty string sentinel: NULLs defeat the unique index. */
			api_key_id: {
				type: "string",
				required: true,
				defaultValue: "",
			},
			unit: { type: "string", required: true },
			requests_total: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			requests_ok: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			latency_ms_sum: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			/** Weighted units in micro-units (`1_000_000` = one unit). */
			units_micro: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			weights_version: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 1,
			},
			/** `flush` or `redis_backfill`. */
			source: {
				type: "string",
				required: true,
				defaultValue: "flush",
			},
			updated_at: { type: "date", required: true },
		},
		indexes: [
			{
				name: "usage_rollups_scope_uniq",
				fields: ["tenant_id", "day", "endpoint", "api_key_id", "unit"],
				unique: true,
			},
			{
				name: "usage_rollups_tenant_day_idx",
				fields: ["tenant_id", "day"],
			},
			{ name: "usage_rollups_unit_day_idx", fields: ["unit", "day"] },
		],
	},

	[USAGE_UNIT_RATES_TABLE]: {
		modelName: USAGE_UNIT_RATES_TABLE,
		fields: {
			unit: { type: "string", required: true },
			plan_tier: { type: "string", required: true },
			/** Price in IDR per whole unit. */
			amount: { type: "number", required: true, defaultValue: 0 },
			currency: { type: "string", required: true, defaultValue: "IDR" },
			/** Epoch milliseconds, stamped on settlements. */
			rates_version: { type: "number", bigint: true, required: true },
			effective_from: { type: "date", required: true },
			/** `null` while the row is the open (current) rate. */
			effective_to: { type: "date", required: false },
			created_at: { type: "date", required: true },
			created_by: { type: "string", required: false },
		},
		indexes: [
			{
				name: "usage_rates_tier_unit_version_uniq",
				fields: ["plan_tier", "unit", "rates_version"],
				unique: true,
			},
			{
				name: "usage_rates_tier_unit_idx",
				fields: ["plan_tier", "unit", "effective_from"],
			},
		],
	},

	[USAGE_ENDPOINT_WEIGHTS_TABLE]: {
		modelName: USAGE_ENDPOINT_WEIGHTS_TABLE,
		fields: {
			/** Route template, or `*` for the default weight. */
			endpoint: { type: "string", required: true },
			unit: { type: "string", required: true },
			weight_micro: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 1_000_000,
			},
			weights_version: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 1,
			},
			effective_from: { type: "date", required: true },
			effective_to: { type: "date", required: false },
			created_at: { type: "date", required: true },
		},
		indexes: [
			{
				name: "usage_weights_endpoint_unit_version_uniq",
				fields: ["endpoint", "unit", "weights_version"],
				unique: true,
			},
			{
				name: "usage_weights_endpoint_unit_idx",
				fields: ["endpoint", "unit", "effective_from"],
			},
		],
	},

	[USAGE_RATE_AUDIT_TABLE]: {
		modelName: USAGE_RATE_AUDIT_TABLE,
		fields: {
			rate_id: { type: "string", required: true },
			actor_user_id: { type: "string", required: false },
			old_amount: { type: "number", required: false },
			new_amount: { type: "number", required: true },
			changed_at: { type: "date", required: true },
			note: { type: "string", required: false },
		},
		indexes: [
			{ name: "usage_rate_audit_rate_idx", fields: ["rate_id"] },
			{ name: "usage_rate_audit_changed_idx", fields: ["changed_at"] },
		],
	},

	[USAGE_SETTLEMENTS_TABLE]: {
		modelName: USAGE_SETTLEMENTS_TABLE,
		fields: {
			tenant_id: { type: "string", required: true },
			/** `YYYY-MM`. */
			period: { type: "string", required: true },
			unit: { type: "string", required: true },
			requests: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			units_micro: {
				type: "number",
				bigint: true,
				required: true,
				defaultValue: 0,
			},
			rates_version: {
				type: "number",
				bigint: true,
				required: false,
			},
			unit_rate_id: { type: "string", required: false },
			amount: { type: "number", required: true, defaultValue: 0 },
			invoice_id: { type: "string", required: false },
			checksum: { type: "string", required: true },
			computed_at: { type: "date", required: true },
		},
		indexes: [
			{
				name: "usage_settlements_tenant_period_unit_uniq",
				fields: ["tenant_id", "period", "unit"],
				unique: true,
			},
			{
				name: "usage_settlements_period_idx",
				fields: ["period", "tenant_id"],
			},
		],
	},
} satisfies BetterAuthPluginDBSchema;

/**
 * Schema-only Better Auth plugin, registered by `@itsrose/auth`.
 *
 * The transport plugin is registered by the host application, which means
 * `db:generate` (driven by the auth composition root) would never see its
 * tables. This plugin carries the schema alone, and declaring it only once
 * avoids merging the same table definitions twice.
 */
export const usageSchemaPlugin = {
	id: USAGE_SCHEMA_PLUGIN_ID,
	schema: usageSchema,
	endpoints: {},
} satisfies BetterAuthPlugin;
