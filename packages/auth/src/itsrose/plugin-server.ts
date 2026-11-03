import { MidtransClient, type ClientOptions } from "@itsrose/midtrans";
import type { BetterAuthPlugin } from "better-auth";
import { getAllPlans } from "./adapter";
import { payment, plan, subscription } from "./routes";
import { itsRoseSchema } from "./schema";
import { ITSROSE_PLUGIN_ID } from "./server/constants";
import type { ItsRosePluginOptions } from "./types";

export const itsRosePlugin = (
	options?: ItsRosePluginOptions | ClientOptions
) => {
	// Normalize options supporting both ItsRosePluginOptions and legacy ClientOptions
	const pluginOpts: ItsRosePluginOptions =
		options && ("midtrans" in options || "autoSeedPlans" in options)
			? (options as ItsRosePluginOptions)
			: { midtrans: options as ClientOptions };

	const client =
		pluginOpts.midtrans instanceof MidtransClient
			? pluginOpts.midtrans
			: new MidtransClient(pluginOpts.midtrans);

	return {
		id: ITSROSE_PLUGIN_ID,
		schema: itsRoseSchema,
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
					// Soft failure on init if migrations haven't run yet
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

declare module "better-auth" {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface BetterAuthPluginRegistry<AuthOptions, Options> {
		itsrose: {
			creator: typeof itsRosePlugin;
		};
	}
}
