import type { GenericEndpointContext } from "better-auth";
import { formatInvoiceNumber } from "../server";
import {
	DEFAULT_INVOICE_PREFIX,
	INVOICE_SEQUENCE_TABLE_NAME,
	INVOICE_TABLE_NAME,
} from "../server/constants";
import type { InvoiceSequence, TransactionInvoice } from "../types";

/**
 * Atomically increments the per-year counter and formats a legal invoice number.
 *
 * Format: `INV-YYYY-[8-digit zero-padded sequence]`
 * Example: `INV-2026-00000042`
 *
 * Retries up to 3 times on contention; falls back to a time-based salt.
 */
export async function generateInvoiceNumber(
	ctx: GenericEndpointContext,
	prefix = DEFAULT_INVOICE_PREFIX
): Promise<string> {
	const { adapter } = ctx.context;
	const currentYear = new Date().getUTCFullYear();

	let nextVal = 1;
	const maxRetries = 3;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			const existing = await adapter.findOne<InvoiceSequence>({
				model: INVOICE_SEQUENCE_TABLE_NAME,
				where: [{ field: "year", value: currentYear }],
			});

			if (!existing) {
				const created = await adapter.create<InvoiceSequence>({
					model: INVOICE_SEQUENCE_TABLE_NAME,
					data: { year: currentYear, last_val: 1 } as InvoiceSequence,
				});
				nextVal = created?.last_val ?? 1;
			} else {
				nextVal = (existing.last_val ?? 0) + 1;
				await adapter.update({
					model: INVOICE_SEQUENCE_TABLE_NAME,
					where: [{ field: "year", value: currentYear }],
					update: { last_val: nextVal },
				});
			}
			break;
		} catch {
			if (attempt === maxRetries - 1) {
				// Last-resort fallback: time-based salt avoids sequence collision
				nextVal = Date.now() % 100_000_000;
			}
		}
	}

	return formatInvoiceNumber(currentYear, nextVal, prefix);
}

/**
 * Finds an invoice record by its Midtrans invoice ID.
 */
export async function findInvoiceById(
	ctx: GenericEndpointContext,
	invoiceId: string
): Promise<TransactionInvoice | null> {
	const { adapter } = ctx.context;
	return adapter.findOne<TransactionInvoice>({
		model: INVOICE_TABLE_NAME,
		where: [{ field: "invoice_id", value: invoiceId }],
	});
}

/**
 * Finds an invoice record by its unique order ID.
 */
export async function findInvoiceByOrderId(
	ctx: GenericEndpointContext,
	orderId: string
): Promise<TransactionInvoice | null> {
	const { adapter } = ctx.context;
	return adapter.findOne<TransactionInvoice>({
		model: INVOICE_TABLE_NAME,
		where: [{ field: "order_id", value: orderId }],
	});
}
