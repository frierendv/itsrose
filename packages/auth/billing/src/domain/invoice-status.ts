import { z } from "zod/v4";

/**
 * The invoice lifecycle vocabulary owned by this domain.
 *
 * It mirrors the "Invoice Status" entry of GLOSSARY.md: the lifecycle state of
 * an Invoice, in exactly one of these states. Provider vocabularies (Midtrans
 * transaction statuses, legacy spellings such as `void`) never reach this
 * column — the payment gateway adapter translates them into these states.
 */
export const InvoiceStatusSchema = z.enum([
	"draft",
	"pending",
	"published",
	"expired",
	"overdue",
	"paid",
	"voided",
	"rejected",
	"canceled",
]);

export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;

/**
 * Every invoice status, in vocabulary order.
 */
export const INVOICE_STATUSES = InvoiceStatusSchema.options;

/**
 * The one place that answers "is this invoice paid?".
 *
 * Both the domain and the application layer ask this question through this
 * predicate, so a status is never compared against a literal in two places
 * that can drift apart.
 *
 * A value outside the vocabulary is never paid: only the domain state `paid`
 * settles an invoice.
 */
export function isPaidInvoiceStatus(
	status: string | null | undefined
): boolean {
	return status === "paid";
}

/**
 * The states an invoice can no longer leave: it is settled, or it was closed
 * without payment.
 */
const NON_VOIDABLE_STATUSES: readonly InvoiceStatus[] = [
	"paid",
	"voided",
	"canceled",
	"rejected",
];

/**
 * Whether an invoice may still be voided at the provider.
 *
 * A status outside the vocabulary is never voidable. An invoice in a state
 * this code does not understand is left untouched rather than cancelled on a
 * guess — voiding is irreversible at the provider.
 */
export function isVoidableStatus(status: string | null | undefined): boolean {
	const parsed = InvoiceStatusSchema.safeParse(status);

	if (!parsed.success) {
		return false;
	}

	return !NON_VOIDABLE_STATUSES.includes(parsed.data);
}
