import type { BetterAuthPlugin } from "better-auth";
import { USAGE_PLUGIN_ID } from "../constants";
import { resolveUsageOptions, type UsagePluginOptions } from "./options";
import { usageAdminEndpoints } from "./routes/admin";
import { usageReadEndpoints } from "./routes/usage";

export type { UsagePluginOptions } from "./options";

/**
 * Better Auth usage plugin: transport only.
 *
 * The plugin id is `usage`, so the endpoints are reachable at
 * `/auth/usage/*` and typed as `authClient.usage.*` on the client. The database
 * schema lives in the schema-only plugin registered by `@itsrose/auth`
 * instead, so the generated SQL stays the single source of truth for DDL.
 */
export const usagePlugin = (options: UsagePluginOptions) => {
	const resolved = resolveUsageOptions(options);

	return {
		id: USAGE_PLUGIN_ID,
		endpoints: {
			...usageReadEndpoints(resolved),
			...usageAdminEndpoints(resolved),
		},
	} satisfies BetterAuthPlugin;
};

declare module "better-auth" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface BetterAuthPluginRegistry<AuthOptions, Options> {
		usage: {
			creator: typeof usagePlugin;
		};
	}
}
