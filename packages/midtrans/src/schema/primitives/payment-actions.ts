import { z } from "zod/v4";

/**
 * Virtual account number entry returned by bank transfer payment methods.
 */
export const VaNumberSchema = z
	.object({
		bank: z
			.string()
			.describe("Target bank (e.g. bca, bni, bri, permata, cimb)"),
		va_number: z.string().describe("Virtual account number to pay to"),
	})
	.meta({
		id: "MidtransVaNumber",
	});

/**
 * Deep-link, QR code, or action redirect returned by e-wallets or QRIS.
 */
export const PaymentActionSchema = z
	.object({
		name: z
			.string()
			.describe(
				"Action identifier (e.g. 'generate-qr-code', 'deeplink-redirect')"
			),
		method: z.string().describe("HTTP method (e.g. 'GET')"),
		url: z
			.string()
			.url()
			.describe("Target URL to execute action or redirect"),
	})
	.meta({
		id: "MidtransPaymentAction",
	});

/**
 * Partial payment amount entry if transaction was split or paid incrementally.
 */
export const PaymentAmountSchema = z
	.object({
		paid_at: z.string().describe("Timestamp of the partial payment"),
		amount: z.string().describe("Amount paid in this chunk"),
	})
	.meta({
		id: "MidtransPaymentAmount",
	});

export type VaNumber = z.infer<typeof VaNumberSchema>;
export type PaymentAction = z.infer<typeof PaymentActionSchema>;
export type PaymentAmount = z.infer<typeof PaymentAmountSchema>;
