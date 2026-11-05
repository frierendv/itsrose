import type { BetterAuthClientPlugin } from "better-auth/client";
import { USAGE_PLUGIN_ID } from "../constants";
import { createRoute } from "../route";
import type { usagePlugin } from "./plugin-server";

/**
 * Client plugin for the usage surface.
 *
 * `$InferServerPlugin` points at the server plugin *type only*, which keeps
 * full RPC autocomplete without pulling any server runtime into browser
 * bundles.
 */
export const usagePluginClient = () => {
	return {
		id: USAGE_PLUGIN_ID,
		$InferServerPlugin: {} as ReturnType<typeof usagePlugin>,
		pathMethods: {
			[createRoute("/stats")]: "GET",
			[createRoute("/summary")]: "GET",
			[createRoute("/timeseries")]: "GET",
			[createRoute("/breakdown")]: "GET",
			[createRoute("/quota")]: "GET",
			[createRoute("/admin/rates")]: "GET",
			[createRoute("/admin/rates/set")]: "POST",
			[createRoute("/admin/flush")]: "POST",
			[createRoute("/admin/settle")]: "POST",
			[createRoute("/admin/settlements")]: "GET",
			[createRoute("/admin/tenants/sync")]: "POST",
		},
	} satisfies BetterAuthClientPlugin;
};
