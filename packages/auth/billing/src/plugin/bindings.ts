import type { MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import {
	createBillingRepositories,
	createBillingUnitOfWork,
	createMidtransPaymentGateway,
} from "../adapter";
import {
	systemClock,
	type BillingDependencies,
	type BillingRepositories,
	type BillingServiceOptions,
} from "../domain/ports";
import type { BillingPluginOptions } from "../types";

export interface BillingServices {
	repositories: BillingRepositories;
	options: BillingServiceOptions;
}

export interface BillingContext {
	dependencies: BillingDependencies;
	options: BillingServiceOptions;
}

/**
 * Builds the context-free application options from the public Better Auth
 * plugin options, closing over the endpoint context for lifecycle hooks.
 */
export function toBillingServiceOptions(
	ctx: GenericEndpointContext,
	opts?: BillingPluginOptions
): BillingServiceOptions {
	const hooks = opts
		? {
				onInvoiceCreated: (
					invoice: Parameters<
						NonNullable<BillingPluginOptions["onInvoiceCreated"]>
					>[0]
				) => opts.onInvoiceCreated?.(invoice, ctx),
				onInvoicePaid: (
					invoice: Parameters<
						NonNullable<BillingPluginOptions["onInvoicePaid"]>
					>[0]
				) => opts.onInvoicePaid?.(invoice, ctx),
				onInvoiceVoided: (
					invoice: Parameters<
						NonNullable<BillingPluginOptions["onInvoiceVoided"]>
					>[0]
				) => opts.onInvoiceVoided?.(invoice, ctx),
				onSubscriptionCreated: (
					subscription: Parameters<
						NonNullable<
							BillingPluginOptions["onSubscriptionCreated"]
						>
					>[0]
				) => opts.onSubscriptionCreated?.(subscription, ctx),
				onSubscriptionUpdated: (
					subscription: Parameters<
						NonNullable<
							BillingPluginOptions["onSubscriptionUpdated"]
						>
					>[0]
				) => opts.onSubscriptionUpdated?.(subscription, ctx),
				onSubscriptionCanceled: (
					subscription: Parameters<
						NonNullable<
							BillingPluginOptions["onSubscriptionCanceled"]
						>
					>[0]
				) => opts.onSubscriptionCanceled?.(subscription, ctx),
			}
		: undefined;

	return {
		defaultDueDays: opts?.defaultDueDays,
		autoSeedPlans: opts?.autoSeedPlans,
		defaultPlans: opts?.defaultPlans,
		hooks,
	};
}

/**
 * Wiring for read/write services that do not need the payment gateway
 * (plan and subscription management).
 */
export function createBillingServices(
	ctx: GenericEndpointContext,
	opts?: BillingPluginOptions
): BillingServices {
	return {
		repositories: createBillingRepositories(ctx),
		options: toBillingServiceOptions(ctx, opts),
	};
}

/**
 * Wiring for application services that need the payment gateway/unit of work
 * (invoices, webhooks, cron).
 */
export function createBillingContext(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	opts?: BillingPluginOptions
): BillingContext {
	const repositories = createBillingRepositories(ctx);

	return {
		dependencies: {
			repositories,
			gateway: createMidtransPaymentGateway(client),
			clock: systemClock,
			unitOfWork: createBillingUnitOfWork(ctx, repositories),
		},
		options: toBillingServiceOptions(ctx, opts),
	};
}
