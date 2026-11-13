import { INVOICE_TYPE } from "../domain/constants";
import {
	isPaidInvoiceStatus,
	type InvoiceStatus,
} from "../domain/invoice-status";
import type {
	BillingDependencies,
	BillingRepositories,
	BillingServiceOptions,
} from "../domain/ports";
import {
	buildDuplicateWebhookEvent,
	buildInvoiceNotFoundEvent,
	buildPaidInvoiceSnapshot,
	buildUnresolvableInvoiceEvent,
	isDuplicatePaidWebhook,
	resolveWebhookNotification,
	type WebhookPayload,
} from "../domain/webhook.service";
import type { TransactionInvoice } from "../types";
import {
	applyNewSubscriptionSettlement,
	applyRenewalSettlement,
	applyUpgradeSettlement,
} from "./subscription.service";

export type WebhookProcessResult =
	| { status: "invalid_signature" }
	| { status: "logged" }
	| { status: "invoice_not_found" }
	| { status: "idempotent_skip"; invoiceId: string }
	| { status: "processed"; invoiceId: string; finalStatus: InvoiceStatus };

/**
 * Application service behind `POST /payment/webhook`.
 *
 * Verifies the notification signature, resolves the local invoice, enforces
 * idempotency, and applies the matching subscription settlement inside the
 * unit-of-work port (a DB transaction when the driver supports it).
 */
export async function processWebhookEvent(
	dependencies: BillingDependencies,
	payload: WebhookPayload,
	options?: BillingServiceOptions
): Promise<WebhookProcessResult> {
	const { repositories, gateway, clock, unitOfWork } = dependencies;

	if (!gateway.verifySignature(payload)) {
		return { status: "invalid_signature" };
	}

	const notification = gateway.parseNotification(payload);
	let invoiceId = notification.invoiceId;

	if (!invoiceId && notification.orderId) {
		const byOrder = await repositories.invoices.findByOrderId(
			notification.orderId
		);
		invoiceId = byOrder?.invoice_id;
	}

	if (!invoiceId) {
		const event = buildUnresolvableInvoiceEvent(payload);
		await repositories.events.record(
			event.event_name,
			event.event_json,
			clock.now()
		);
		return { status: "logged" };
	}

	const existingInvoice = await repositories.invoices.findById(invoiceId);

	if (!existingInvoice) {
		const event = buildInvoiceNotFoundEvent(invoiceId, payload);
		await repositories.events.record(
			event.event_name,
			event.event_json,
			clock.now()
		);
		return { status: "invoice_not_found" };
	}

	if (isDuplicatePaidWebhook(existingInvoice)) {
		const event = buildDuplicateWebhookEvent(existingInvoice);
		await repositories.events.record(
			event.event_name,
			event.event_json,
			clock.now()
		);
		return { status: "idempotent_skip", invoiceId };
	}

	const remoteData = await gateway.getInvoice(invoiceId);

	const outcome = resolveWebhookNotification({
		existingInvoice,
		remoteData,
		notificationStatus: notification.status,
		payload,
		now: clock.now(),
	});

	await unitOfWork.run(async (transactionRepositories) => {
		await transactionRepositories.invoices.update(
			invoiceId,
			outcome.invoiceUpdate
		);
		await transactionRepositories.events.record(
			outcome.eventName,
			outcome.eventJson,
			clock.now()
		);

		if (!isPaidInvoiceStatus(outcome.finalStatus)) {
			return;
		}

		const paidInvoice = buildPaidInvoiceSnapshot(
			existingInvoice,
			outcome,
			clock.now()
		);
		const priorSubscription =
			await transactionRepositories.subscriptions.findCurrentByUser(
				existingInvoice.user_id
			);

		const updatedSubscription = await applySettlementForInvoice(
			transactionRepositories,
			dependencies,
			paidInvoice
		);

		if (priorSubscription) {
			await options?.hooks?.onSubscriptionUpdated?.(updatedSubscription);
		} else {
			await options?.hooks?.onSubscriptionCreated?.(updatedSubscription);
		}

		await options?.hooks?.onInvoicePaid?.(paidInvoice);
	});

	return {
		status: "processed",
		invoiceId,
		finalStatus: outcome.finalStatus,
	};
}

async function applySettlementForInvoice(
	repositories: BillingRepositories,
	dependencies: BillingDependencies,
	invoice: TransactionInvoice
) {
	const settlementRepositories = repositories.subscriptions;

	switch (invoice.invoice_type) {
		case INVOICE_TYPE.UPGRADE:
			return applyUpgradeSettlement(
				settlementRepositories,
				dependencies.clock,
				invoice
			);
		case INVOICE_TYPE.RENEWAL:
			return applyRenewalSettlement(
				settlementRepositories,
				dependencies.clock,
				invoice
			);
		case INVOICE_TYPE.NEW:
		default:
			return applyNewSubscriptionSettlement(
				settlementRepositories,
				dependencies.clock,
				invoice
			);
	}
}
