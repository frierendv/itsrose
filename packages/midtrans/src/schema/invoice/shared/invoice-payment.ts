import { z } from "zod/v4";
import {
	CallbacksSchema,
	ExpirySchema,
	PaymentChannelBank,
	PaymentChannels,
} from "../../primitives";

export const InvoicePaymentTypeSchema = z.enum([
	"payment_link",
	"virtual_account",
]);
export type InvoicePaymentType = z.infer<typeof InvoicePaymentTypeSchema>;

/**
 * Representing paymen link method
 */
export const InvoicePaymentLinkSchema = z.object({
	/**
	 * Use payment link API method to receive Payment.
	 */
	payment_type: InvoicePaymentTypeSchema.extract(["payment_link"]),
	/**
	 * `enabled_payments` is required when `payment_link` is passed.
	 */
	payment_link: z
		.object({
			/**
			 * Indicate payment link to use custom expiry.
			 *
			 * If `false` then the payment link expiry will be same as invoice `due_date`.
			 */
			is_custom_expiry: z.boolean(),
			/**
			 * Payment link {@linkcode SnapExpiry | expiry} property.
			 */
			expiry: ExpirySchema,
			/**
			 * Payment methods that will be used in payment link.
			 *
			 * Required by Midtrans API when `payment_link` object omitted.
			 */
			enabled_payments: z.array(PaymentChannels),
			callbacks: CallbacksSchema.pick({ finish: true }),
		})
		.partial()
		.required({ enabled_payments: true }) // required when `payment_link` object passed.
		.nullish(),
});
export type InvoicePaymentLink = z.infer<typeof InvoicePaymentLinkSchema>;

/**
 * Repsrensintg virtual account payment method
 */
export const InvoicePaymentVirtualAccountSchema = z.object({
	/**
	 * Use Virtual Account to receive Payment.
	 */
	payment_type: InvoicePaymentTypeSchema.extract(["virtual_account"]),
	/**
	 * Only available for `payment_type` = `virtual_account`
	 */
	virtual_accounts: z.array(
		z.object({
			/**
			 * Bank provider name.
			 *
			 * Refers to {@link https://docs.midtrans.com/reference/json-objects-1#virtual-account | #virtual-account}
			 * */
			name: z.enum([
				...PaymentChannelBank.extract([
					"bca_va",
					"bni_va",
					"bri_va",
					"cimb_va",
					"permata_va",
				]).options,
				"mandiri_bill",
			]),
			/**
			 * Custom va number with different min and max length for each bank provider
			 */
			number: z.string().optional(),
		})
	),
});
export type InvoicePaymentVirtualAccount = z.infer<
	typeof InvoicePaymentVirtualAccountSchema
>;
