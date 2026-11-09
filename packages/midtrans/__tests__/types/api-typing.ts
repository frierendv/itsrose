/**
 * Compile-only assertions for the Phase 4 request/response API typing.
 *
 * This file is typechecked by `tsc`, not executed by Jest.
 */
import type { MidtransClient } from "../../src/client/client";

type InvoiceCreateBody = Parameters<MidtransClient["invoice"]["create"]>[0];
type InvoiceCreateData = NonNullable<
	Awaited<ReturnType<MidtransClient["invoice"]["create"]>>["data"]
>;
type PaymentLinkCreateBody = Parameters<
	MidtransClient["paymentLink"]["create"]
>[0];
type SnapCreateBody = Parameters<MidtransClient["snap"]["create"]>[0];

export const invoiceCreateBody: InvoiceCreateBody = {
	order_id: "ORDER-1",
	invoice_number: "INV-1",
	invoice_date: "2026-11-09T22:00:00+07:00",
	due_date: "2026-12-31T23:59:00+07:00",
	customer_details: {
		name: "Probe User",
		email: "probe@example.org",
		phone: "8123456789",
	},
	item_details: [{ item_id: "sku-1", quantity: 1, price: 15000 }],
	payment_type: "payment_link",
	payment_link: { enabled_payments: ["bca_va"] },
	document_type: "invoice",
	tax_mode: "exclusive",
};

export const paymentLinkCreateBody: PaymentLinkCreateBody = {
	transaction_details: { order_id: "PL-1", gross_amount: 15000 },
	enabled_payments: ["bca_va", "gopay"],
	customer_details: {
		first_name: "Probe",
		last_name: "User",
		email: "probe@example.org",
		phone: "8123456789",
	},
	item_details: [{ id: "sku-1", price: 15000, quantity: 1, name: "Item" }],
	expiry: { duration: 1, unit: "days" },
};

export const snapCreateBody: SnapCreateBody = {
	transaction_details: { order_id: "S-1", gross_amount: 15000 },
	item_details: [{ id: "sku-1", price: 15000, quantity: 1, name: "Item" }],
	enabled_payments: [
		"credit_card",
		"akulaku",
		"kredivo",
		"other_qris",
		"bca_va",
		"echannel",
	],
	callbacks: {
		finish: "https://example.test/finish",
		unfinish: "https://example.test/unfinish",
	},
	gopay: {
		enable_callback: true,
		callback_url: "https://example.test/callback",
	},
};

export function assertInvoiceData(data: InvoiceCreateData): void {
	const id: string = data.id;
	void id;
}

export function captureCall(client: MidtransClient): void {
	client.core.payment.capture({ transaction_id: "transaction-1" });
}

export function assertStatusError(
	result: Awaited<ReturnType<MidtransClient["core"]["payment"]["status"]>>
): void {
	const error = result.error;
	if (error) {
		const kind: "core" | "legacy" | "unauthorized" | "transport" =
			error.kind;
		void kind;
	}
}

export function refundCalls(client: MidtransClient): void {
	client.core.payment.refund("ORDER-1", { reason: "requested" });
	client.core.payment.refund("ORDER-1", { idempotencyKey: "key" });
	client.core.payment.refund("ORDER-1");
}

export function statusB2BCalls(client: MidtransClient): void {
	client.core.payment.statusB2B("ORDER-1", { page: 1, per_page: 5 });
	client.core.payment.statusB2B("ORDER-1", { idempotencyKey: "key" });
	client.core.payment.statusB2B("ORDER-1");
}

export function subscriptionCalls(client: MidtransClient): void {
	client.core.subscription.create({
		name: "pro",
		amount: "15000",
		currency: "IDR",
		payment_type: "credit_card",
		token: "token-1",
		schedule: { interval: 1, interval_unit: "month" },
	});
	client.core.subscription.update("sub-1", { name: "pro" });
}

export function snapPreferenceCall(client: MidtransClient): void {
	client.snap.updatePreferences({ display_name: "ItsRose" });
}

export function abortSignalCall(client: MidtransClient): void {
	const controller = new AbortController();
	client.core.payment.status("ORDER-1", { signal: controller.signal });
}
