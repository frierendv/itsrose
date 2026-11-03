import { InvoiceWebhookSchema, type MidtransClient } from "@itsrose/midtrans";
import type { GenericEndpointContext } from "better-auth";
import { INVOICE_EVENT_TABLE_NAME, INVOICE_TYPE } from "../domain/constants";
import type { MidtransInvoiceResult } from "../domain/invoice.service";
import {
	buildDuplicateWebhookEvent,
	buildInvoiceNotFoundEvent,
	buildPaidInvoiceSnapshot,
	buildUnresolvableInvoiceEvent,
	isDuplicatePaidWebhook,
	readOrderId,
	resolveWebhookInvoiceId,
	resolveWebhookNotification,
	type WebhookPayload,
} from "../domain/webhook.service";
import type { BillingPluginOptions, Subscription } from "../types";
import { findInvoiceById, findInvoiceByOrderId } from "./invoice";
import { createBillingRepositories } from "./repository";
import {
	applyNewSubscriptionSettlement,
	applyRenewalSettlement,
	applyUpgradeSettlement,
	getUserSubscription,
} from "./subscription";

export type WebhookProcessResult =
	| { status: "invalid_signature" }
	| { status: "logged" }
	| { status: "invoice_not_found" }
	| { status: "idempotent_skip"; invoiceId: string }
	| { status: "processed"; invoiceId: string; finalStatus: string };

/**
 * Application service behind `POST /payment/webhook`.
 *
 * Verifies the notification signature, resolves the local invoice, enforces
 * idempotency, and applies the matching subscription settlement inside a
 * single adapter transaction when the driver supports it.
 */
export async function processWebhookEvent(
	ctx: GenericEndpointContext,
	client: MidtransClient,
	payload: WebhookPayload,
	opts?: BillingPluginOptions
): Promise<WebhookProcessResult> {
	if (!client.merchant.verifySignature(payload as never)) {
		return { status: "invalid_signature" };
	}

	const parsed = InvoiceWebhookSchema.safeParse(payload);
	let invoiceId = resolveWebhookInvoiceId(
		parsed.success ? parsed.data : null
	);

	if (!invoiceId) {
		const orderId = readOrderId(payload);
		if (orderId) {
			const byOrder = await findInvoiceByOrderId(ctx, orderId);
			invoiceId = byOrder?.invoice_id;
		}
	}

	if (!invoiceId) {
		const event = buildUnresolvableInvoiceEvent(payload);
		await ctx.context.adapter.create({
			model: INVOICE_EVENT_TABLE_NAME,
			data: {
				event_name: event.event_name,
				created_at: new Date(),
				event_json: event.event_json,
			},
		});
		return { status: "logged" };
	}

	const existingInvoice = await findInvoiceById(ctx, invoiceId);

	if (!existingInvoice) {
		const event = buildInvoiceNotFoundEvent(invoiceId, payload);
		await ctx.context.adapter.create({
			model: INVOICE_EVENT_TABLE_NAME,
			data: {
				event_name: event.event_name,
				created_at: new Date(),
				event_json: event.event_json,
			},
		});
		return { status: "invoice_not_found" };
	}

	if (isDuplicatePaidWebhook(existingInvoice)) {
		const event = buildDuplicateWebhookEvent(existingInvoice);
		await ctx.context.adapter.create({
			model: INVOICE_EVENT_TABLE_NAME,
			data: {
				event_name: event.event_name,
				created_at: new Date(),
				event_json: event.event_json,
			},
		});
		return { status: "idempotent_skip", invoiceId };
	}

	const { data: remoteData } = await client.invoice.get(invoiceId);

	const outcome = resolveWebhookNotification({
		existingInvoice,
		remoteData: (remoteData ?? null) as MidtransInvoiceResult | null,
		payload,
	});

	const adapter = ctx.context.adapter;

	const executeTransition = async (transactionAdapter: any) => {
		const transactionContext = {
			...ctx,
			context: { ...ctx.context, adapter: transactionAdapter },
		} as GenericEndpointContext;
		const repositories = createBillingRepositories(transactionContext);

		await repositories.invoices.update(invoiceId, outcome.invoiceUpdate);
		await repositories.events.record(outcome.eventName, outcome.eventJson);

		if (outcome.finalStatus !== "paid") {
			return;
		}

		const paidInvoice = buildPaidInvoiceSnapshot(existingInvoice, outcome);
		const priorSubscription = await getUserSubscription(
			transactionContext,
			existingInvoice.user_id
		);

		let updatedSubscription: Subscription;

		switch (existingInvoice.invoice_type) {
			case INVOICE_TYPE.UPGRADE:
				updatedSubscription = await applyUpgradeSettlement(
					transactionContext,
					paidInvoice
				);
				break;
			case INVOICE_TYPE.RENEWAL:
				updatedSubscription = await applyRenewalSettlement(
					transactionContext,
					paidInvoice
				);
				break;
			case INVOICE_TYPE.NEW:
			default:
				updatedSubscription = await applyNewSubscriptionSettlement(
					transactionContext,
					paidInvoice
				);
				break;
		}

		if (priorSubscription) {
			await opts?.onSubscriptionUpdated?.(updatedSubscription, ctx);
		} else {
			await opts?.onSubscriptionCreated?.(updatedSubscription, ctx);
		}

		await opts?.onInvoicePaid?.(paidInvoice, ctx);
	};

	if (typeof adapter.transaction === "function") {
		await adapter.transaction(executeTransition);
	} else {
		await executeTransition(adapter);
	}

	return {
		status: "processed",
		invoiceId,
		finalStatus: outcome.finalStatus,
	};
}
