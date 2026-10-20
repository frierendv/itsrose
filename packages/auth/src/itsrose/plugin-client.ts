import type { BetterAuthClientPlugin } from "better-auth/client";
import type { itsRosePlugin } from "./plugin-server";
import { ITSROSE_PLUGIN_ID } from "./server/constants";
import { createRoute } from "./server/utils";

export const itsRosePluginClient = () => {
	return {
		id: ITSROSE_PLUGIN_ID,
		$InferServerPlugin: {} as ReturnType<typeof itsRosePlugin>,
		pathMethods: {
			// Payment & invoice routes
			[createRoute("/payment/create-invoice")]: "POST",
			[createRoute("/payment/get-invoice")]: "GET",
			[createRoute("/payment/list-invoice")]: "GET",
			[createRoute("/payment/void-invoice")]: "POST",
			[createRoute("/payment/webhook")]: "POST",

			// Billing plan routes
			[createRoute("/plan/list")]: "GET",
			[createRoute("/plan/get")]: "GET",
			[createRoute("/plan/create")]: "POST",
			[createRoute("/plan/update")]: "POST",
			[createRoute("/plan/delete")]: "POST",
			[createRoute("/plan/seed")]: "POST",
			[createRoute("/plan/user")]: "GET",

			// Subscription routes
			[createRoute("/subscription/create")]: "POST",
			[createRoute("/subscription/update")]: "POST",
			[createRoute("/subscription/upgrade")]: "POST",
			[createRoute("/subscription/downgrade")]: "POST",
			[createRoute("/subscription/cancel-downgrade")]: "POST",
			[createRoute("/subscription/cancel")]: "POST",
			[createRoute("/subscription/restore")]: "POST",
			[createRoute("/subscription/has-access")]: "GET",
			[createRoute("/subscription/get")]: "GET",
			[createRoute("/subscription/list")]: "GET",
			[createRoute("/subscription/cron")]: "POST",
		},
	} satisfies BetterAuthClientPlugin;
};
