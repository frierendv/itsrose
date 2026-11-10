import { z } from "zod/v4";
import {
	CallbacksSchema,
	ExpirySchema,
	PaymentChannelBank,
	PaymentChannels,
} from "../primitives";

/* -------------------------------- Status -------------------------------- */

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

/* ---------------------------- Document Type ----------------------------- */

export const InvoiceDocumentTypeSchema = z.enum(["invoice", "quotation"]);
export type InvoiceDocumentType = z.infer<typeof InvoiceDocumentTypeSchema>;

/* -------------------------------- Taxes --------------------------------- */

export const InvoiceTaxModeSchema = z.enum(["inclusive", "exclusive"]).meta({
	id: "MidtransInvoiceTaxMode",
});
export type InvoiceTaxMode = z.infer<typeof InvoiceTaxModeSchema>;

export const InvoiceTaxSchema = z.object({
	/** Tax label shown in the invoice, for example PPN. */
	name: z.string(),
	/** Tax calculation type. */
	type: z.enum(["percentage", "fixed"]),
	/**
	 * Tax amount value. If type is percentage, use percent value (for example 10 means 10%).
	 * If `taxes[].type` is set to `fixed`, use nominal amount.
	 */
	value: z.number().positive(),
});
export type InvoiceTax = z.infer<typeof InvoiceTaxSchema>;

export const InvoiceTaxesSchema = z.discriminatedUnion("tax_mode", [
	z.object({
		tax_mode: InvoiceTaxModeSchema.extract(["inclusive"]),
		taxes: InvoiceTaxSchema.array(),
	}),
	z.object({
		tax_mode: InvoiceTaxModeSchema.extract(["exclusive"]).nullish(),
		taxes: InvoiceTaxSchema.array().optional(),
	}),
]);
export type InvoiceTaxes = z.infer<typeof InvoiceTaxesSchema>;

/* -------------------------------- Amount -------------------------------- */

export const InvoiceAmountSchema = z.object({
	/** @deprecated Use `taxes` */
	vat_type: z.string().optional(),
	/** @deprecated Use `taxes` */
	vat: z.string().optional(),
	/** Discount amount. */
	discount: z
		.number()
		.positive()
		.transform((v) => v.toString())
		.optional(),
	/** Shipping amount. */
	shipping: z
		.number()
		.positive()
		.transform((v) => v.toString())
		.optional(),
	total_tax: z.union([z.string(), z.number()]).optional(),
	base_amount: z.union([z.string(), z.number()]).optional(),
});
export type InvoiceAmount = z.infer<typeof InvoiceAmountSchema>;

/* ----------------------------- Item Details ----------------------------- */

/**
 * Item detail used by Invoice API
 */
export const InvoiceItemDetailsSchema = z
	.union([
		z.object({ item_id: z.string() }),
		z.object({ description: z.string().max(150) }),
	])
	.and(
		z.object({
			item_id: z.string().optional(),
			description: z.string().max(150).optional(),
			quantity: z.number().positive().min(1).max(99999999),
			price: z.number().positive().max(99999999),
			discount_percentage: z.number().positive().max(100).optional(),
			discount_amount: z.union([z.number(), z.string()]).nullish(),
		})
	);
export type InvoiceItemDetails = z.infer<typeof InvoiceItemDetailsSchema>;

/* --------------------------- Customer Details --------------------------- */

/**
 * Customer details specific to invoice creation.
 */
export const InvoiceCustomerDetailsSchema = z.object({
	id: z.string().max(36).optional(),
	name: z.string().max(40),
	email: z.email().optional(),
	phone: z.string().optional(),
	notes: z.string().nullish(),
});
export type InvoiceCustomerDetails = z.infer<
	typeof InvoiceCustomerDetailsSchema
>;

/* ------------------------------- Metadata ------------------------------- */

export const InvoiceMetadataSchema = z.object({
	/** Invoice id; if this comes from webhook */
	midtrans_invoice_id: z.string(),
	extra_info: z
		.object({
			payment_link_type: z
				.enum(["FIXED_AMOUNT", "DYNAMIC_AMOUNT"])
				.optional(),
			payment_link_id: z.string().optional(),
		})
		.nullish(),
});
export type InvoiceMetadata = z.infer<typeof InvoiceMetadataSchema>;

/* ------------------------------ Quotation ------------------------------- */

export const InvoiceQuotationSchema = z.object({
	/**
	 * Date when the quotation is issued, in ISO 8601 format.
	 * Default time zone: GMT+7.
	 */
	quotation_date: z.string(),
	/**
	 * Expiration date of the quotation, in ISO 8601 format.
	 * Default time zone: GMT+7 and must be after `quotation_date`.
	 */
	quotation_validity_date: z.string(),
	quotation_title: z.string().max(30).optional(),
	quotation_terms_conditions: z.string().max(255).optional(),
});
export type InvoiceQuotation = z.infer<typeof InvoiceQuotationSchema>;

/* ------------------------------- Payment -------------------------------- */

export const InvoicePaymentTypeSchema = z.enum([
	"payment_link",
	"virtual_account",
]);
export type InvoicePaymentType = z.infer<typeof InvoicePaymentTypeSchema>;

/**
 * Representing payment link method
 */
export const InvoicePaymentLinkSchema = z.object({
	payment_type: InvoicePaymentTypeSchema.extract(["payment_link"]),
	payment_link: z
		.object({
			is_custom_expiry: z.boolean(),
			expiry: ExpirySchema,
			enabled_payments: z.array(PaymentChannels),
			callbacks: CallbacksSchema.pick({ finish: true }),
		})
		.partial()
		.required({ enabled_payments: true })
		.nullish(),
});
export type InvoicePaymentLink = z.infer<typeof InvoicePaymentLinkSchema>;

/**
 * Representing virtual account payment method
 */
export const InvoicePaymentVirtualAccountSchema = z.object({
	payment_type: InvoicePaymentTypeSchema.extract(["virtual_account"]),
	virtual_accounts: z.array(
		z.object({
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
			number: z.string().optional(),
		})
	),
});
export type InvoicePaymentVirtualAccount = z.infer<
	typeof InvoicePaymentVirtualAccountSchema
>;
