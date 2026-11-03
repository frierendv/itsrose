import { MidtransClient, type ClientOptions } from "@itsrose/midtrans";
import type { BetterAuthPlugin } from "better-auth";
import { getAllPlans } from "../adapter";
import { ITSROSE_PLUGIN_ID } from "../domain/constants";
import { billingSchema } from "../schema";
import type { BillingPluginOptions } from "../types";
import { payment, plan, subscription } from "./routes";

/**
 * Better Auth billing plugin.
 *
 * The plugin id stays `itsrose` so every existing `/itsrose/*` route and
 * `authClient.itsrose.*` call keeps working after the package split.
 */
export const itsRosePlugin = (
	options?: BillingPluginOptions | ClientOptions
) => {
	// Normalize options supporting both the plugin options object and the
	// legacy Midtrans `ClientOptions` shape.
	const pluginOpts: BillingPluginOptions =
		options && ("midtrans" in options || "autoSeedPlans" in options)
			? (options as BillingPluginOptions)
			: { midtrans: options as ClientOptions };

	const client =
		pluginOpts.midtrans instanceof MidtransClient
			? pluginOpts.midtrans
			: new MidtransClient(pluginOpts.midtrans);

	return {
		id: ITSROSE_PLUGIN_ID,
		schema: billingSchema,
		endpoints: {
			// Billing plan endpoints
			listPlan: plan.listPlanEndpoint(pluginOpts),
			getPlan: plan.getPlanEndpoint(),
			createPlan: plan.createPlanEndpoint(),
			updatePlan: plan.updatePlanEndpoint(),
			deletePlan: plan.deletePlanEndpoint(),
			seedPlans: plan.seedPlansEndpoint(pluginOpts),
			getUserPlan: plan.userPlanEndpoint(),

			// Payment & invoice endpoints
			createInvoice: payment.createInvoiceEndpoint(client, pluginOpts),
			getInvoice: payment.getInvoiceEndpoint(client),
			listInvoice: payment.listInvoiceEndpoint(),
			listEvents: payment.listEventsEndpoint(),
			voidInvoice: payment.voidInvoiceEndpoint(client, pluginOpts),
			webhook: payment.webhookEndpoint(client, pluginOpts),

			// Subscription lifecycle endpoints
			createSubscription:
				subscription.createSubscriptionEndpoint(pluginOpts),
			updateSubscription:
				subscription.updateSubscriptionEndpoint(pluginOpts),
			upgradeSubscription: subscription.upgradeSubscriptionEndpoint(
				client,
				pluginOpts
			),
			downgradeSubscription:
				subscription.downgradeSubscriptionEndpoint(pluginOpts),
			cancelDowngradeSubscription:
				subscription.cancelDowngradeEndpoint(pluginOpts),
			cancelSubscription:
				subscription.cancelSubscriptionEndpoint(pluginOpts),
			restoreSubscription:
				subscription.restoreSubscriptionEndpoint(pluginOpts),
			hasAccessSubscription: subscription.hasAccessEndpoint(pluginOpts),
			getSubscription: subscription.getSubscriptionEndpoint(pluginOpts),
			listSubscription: subscription.listSubscriptionEndpoint(pluginOpts),
			cronSubscription: subscription.runBillingCronEndpoint(
				client,
				pluginOpts
			),
		},
		init: async (ctx) => {
			if (pluginOpts.autoSeedPlans !== false && ctx.adapter) {
				try {
					await getAllPlans(ctx as any, pluginOpts.defaultPlans);
				} catch {
					// Soft failure on init if migrations haven't run yet.
				}
			}
			return {
				context: {
					midtrans: client,
				},
			};
		},
	} satisfies BetterAuthPlugin;
};

/** Preferred name; `itsRosePlugin` is kept as a compatibility alias. */
export const billingPlugin = itsRosePlugin;

declare module "better-auth" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface BetterAuthPluginRegistry<AuthOptions, Options> {
		itsrose: {
			creator: typeof itsRosePlugin;
		};
	}
}
