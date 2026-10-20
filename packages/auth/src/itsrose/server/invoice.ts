import { DEFAULT_INVOICE_PREFIX } from "./constants";

/**
 * Calculates current date and future due date ISO strings.
 */
export function calculateInvoiceDates(dueInDays = 3) {
	const now = new Date();
	const dueDate = new Date(now.getTime() + dueInDays * 24 * 60 * 60 * 1000);

	return {
		invoiceDate: now.toISOString(),
		dueDate: dueDate.toISOString(),
	};
}

/**
 * Formats standard invoice sequence number.
 * Example: `INV-2026-00000042`
 */
export function formatInvoiceNumber(
	year: number,
	sequence: number,
	prefix: string = DEFAULT_INVOICE_PREFIX
): string {
	const paddedSequence = String(sequence).padStart(8, "0");
	return `${prefix}-${year}-${paddedSequence}`;
}
