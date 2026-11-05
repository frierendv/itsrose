import type { BetterAuthPluginDBSchema } from "better-auth";
import {
	TENANT_MEMBER_TABLE_NAME,
	TENANT_TABLE_NAME,
} from "../domain/constants";

/**
 * Tenancy tables.
 *
 * `tenants.id` is derived deterministically from the owning user for personal
 * tenants (`tenantIdForUser`), so the metering hot path can attribute a request
 * without a lookup. Organization tenants keep real ids and resolve through
 * `tenant_members` once the Better Auth `organization` plugin is installed.
 */
export const tenantSchema = {
	[TENANT_TABLE_NAME]: {
		modelName: TENANT_TABLE_NAME,
		fields: {
			kind: { type: "string", required: true, defaultValue: "personal" },
			name: { type: "string", required: true },
			owner_user_id: {
				type: "string",
				required: true,
				references: {
					field: "id",
					model: "user",
					onDelete: "cascade",
				},
			},
			created_at: { type: "date", required: true },
		},
		indexes: [
			{ name: "tenants_owner_user_idx", fields: ["owner_user_id"] },
			{ name: "tenants_kind_idx", fields: ["kind"] },
		],
	},

	[TENANT_MEMBER_TABLE_NAME]: {
		modelName: TENANT_MEMBER_TABLE_NAME,
		fields: {
			tenant_id: {
				type: "string",
				required: true,
				references: {
					field: "id",
					model: TENANT_TABLE_NAME,
					onDelete: "cascade",
				},
			},
			user_id: {
				type: "string",
				required: true,
				references: {
					field: "id",
					model: "user",
					onDelete: "cascade",
				},
			},
			role: { type: "string", required: true, defaultValue: "owner" },
			created_at: { type: "date", required: true },
		},
		indexes: [
			{
				name: "tenant_members_tenant_user_uniq",
				fields: ["tenant_id", "user_id"],
				unique: true,
			},
			{ name: "tenant_members_user_idx", fields: ["user_id"] },
		],
	},
} satisfies BetterAuthPluginDBSchema;
