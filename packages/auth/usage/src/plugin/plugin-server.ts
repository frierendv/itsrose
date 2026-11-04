import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { createRoute } from "../route";
import type { UsageStatsPort } from "../types";

export type UsagePluginOptions = {
	/** Reads usage counters from the host application's storage. */
	stats: UsageStatsPort;
};

/**
 * Better Auth usage plugin exposing per-user API usage statistics.
 *
 * The plugin id is `usage`, so the endpoint is reachable at
 * `/usage/stats` and typed as `authClient.usage.stats()` on the client.
 */
export const usagePlugin = (options: UsagePluginOptions) => {
	return {
		id: "usage" as const,
		endpoints: {
			getStats: createAuthEndpoint(
				createRoute("/stats"),
				{
					method: "GET",
					use: [sessionMiddleware],
				},
				async (ctx) => {
					const { user } = ctx.context.session;
					const stats = await options.stats.getStats(user.id);
					return ctx.json(stats);
				}
			),
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
