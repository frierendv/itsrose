import { z } from "zod/v4";
import { PaymentChannels } from "../../primitives";
import { PaymentLinkExpirySchema } from "../shared";

const FreeTextItemSchema = z.object({
	en: z.string(),
	id: z.string(),
});

/**
 * Free text displayed on the virtual account payment screen.
 *
 * The API returns `null` entries when no free text is configured.
 */
export const PaymentLinkFreeTextSchema = z
	.object({
		inquiry: z.array(FreeTextItemSchema).nullish(),
		payment: z.array(FreeTextItemSchema).nullish(),
	})
	.nullish();

export type PaymentLinkFreeText = z.infer<typeof PaymentLinkFreeTextSchema>;

/**
 * Virtual account configuration returned for a payment link.
 */
export const PaymentLinkVirtualAccountEntrySchema = z.object({
	number: z.string().nullish(),
	recipient_name: z.string().nullish(),
	free_text: PaymentLinkFreeTextSchema,
});

export type PaymentLinkVirtualAccountEntry = z.infer<
	typeof PaymentLinkVirtualAccountEntrySchema
>;

/**
 * Virtual account entries keyed by bank.
 */
export const PaymentLinkVirtualAccountSchema = z.object({
	bca_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	bni_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	bri_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	bsi_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	cimb_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	danamon_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	permata_va: PaymentLinkVirtualAccountEntrySchema.optional(),
	seabank_va: PaymentLinkVirtualAccountEntrySchema.optional(),
});

export type PaymentLinkVirtualAccount = z.infer<
	typeof PaymentLinkVirtualAccountSchema
>;

/**
 * Credit card configuration returned for a payment link.
 */
export const PaymentLinkCreditCardSchema = z.object({
	bank: z.string().nullish(),
	type: z.string(),
	secure: z.boolean(),
	whitelist_bins: z.array(z.string()).nullish(),
	installment: z.object({
		required: z.boolean(),
		disabled: z.boolean(),
	}),
});

export type PaymentLinkCreditCard = z.infer<typeof PaymentLinkCreditCardSchema>;

/**
 * Item entry returned in the payment link detail.
 */
export const PaymentLinkResponseItemSchema = z.object({
	id: z.union([z.string(), z.number()]),
	name: z.string(),
	price: z.number(),
	quantity: z.number(),
	brand: z.string().nullish(),
	category: z.string().nullish(),
	merchant_name: z.string().nullish(),
	item_id: z.string().nullish(),
	payment_link_id: z.union([z.string(), z.number()]),
	createdAt: z.string(),
	updatedAt: z.string(),
	PaymentLinkId: z.union([z.string(), z.number()]).optional(),
});

export type PaymentLinkResponseItem = z.infer<
	typeof PaymentLinkResponseItemSchema
>;

/**
 * Customer details attached to a payment link.
 *
 * The API returns `null` when no customer is attached.
 */
export const PaymentLinkCustomerDetailsSchema = z
	.object({
		id: z.union([z.string(), z.number()]).optional(),
		user_id: z.union([z.string(), z.number()]).nullish(),
		full_name: z.string(),
		first_name: z.string().nullish(),
		last_name: z.string().nullish(),
		email: z.string().nullish(),
		phone: z.string().nullish(),
		address: z.string().nullish(),
		address_city: z.string().nullish(),
		address_postal: z.string().nullish(),
		address_country: z.string().nullish(),
		created_at: z.string().optional(),
		updated_at: z.string().optional(),
		PaymentLinkId: z.union([z.string(), z.number()]).nullish(),
	})
	.nullish();

export type PaymentLinkCustomerDetails = z.infer<
	typeof PaymentLinkCustomerDetailsSchema
>;

/**
 * Purchase record for a payment link.
 */
export const PaymentLinkPurchaseSchema = z
	.object({
		id: z.union([z.string(), z.number()]),
		transaction_id: z.string(),
		order_id: z.string(),
		snap_token: z.string(),
		payment_status: z.string(),
		payment_method: z.string(),
		payment_link_id: z.union([z.string(), z.number()]),
		acquirer: z.string(),
		amount_value: z.number().int(),
		amount_currency: z.string(),
		expiry_time: z.string(),
		created_at: z.string().optional(),
		updated_at: z.string().optional(),
	})
	.meta({ id: "MidtransPaymentLinkPurchase" });

export type PaymentLinkPurchaseDetail = z.infer<
	typeof PaymentLinkPurchaseSchema
>;

/**
 * Details of an existing payment link.
 *
 * `GET /v1/payment-links/{orderId}`
 */
export const PaymentLinkDetailResponseSchema = z
	.object({
		id: z.union([z.string(), z.number()]),
		order_id: z.string(),
		merchant_id: z.string(),
		payment_link_id: z.string(),
		payment_link_url: z.url(),
		qr_url: z.url().optional(),
		payment_link_type: z.enum(["FIXED_AMOUNT", "DYNAMIC_AMOUNT"]),
		usage_limit: z.number(),
		usage: z.number(),
		gross_amount: z.number(),
		currency: z.string(),
		enabled_payments: z.array(PaymentChannels),
		enabled_payments_raw: z.string(),
		item_details: z.array(PaymentLinkResponseItemSchema),
		customer_details: PaymentLinkCustomerDetailsSchema,
		expiry: PaymentLinkExpirySchema,
		expires_at: z.string().optional(),
		expiry_start: z.string().optional(),
		expiry_duration: z.number().optional(),
		expiry_unit: z.string().optional(),
		virtual_account: PaymentLinkVirtualAccountSchema.optional(),
		credit_card: PaymentLinkCreditCardSchema.optional(),
		purchases: z.array(PaymentLinkPurchaseSchema),

		// Customer requirements
		customer_required: z.boolean().optional(),
		customer_address_required: z.boolean().optional(),
		specific_customer: z.boolean().optional(),
		first_name_required: z.boolean().optional(),
		email_required: z.boolean().optional(),
		phone_required: z.boolean().optional(),

		// Flat credit-card configuration
		credit_card_3d_secure: z.boolean().optional(),
		credit_card_type: z.string().optional(),
		credit_card_bank: z.string().nullish(),
		credit_card_installment_required: z.boolean().optional(),
		credit_card_installment_disabled: z.boolean().optional(),
		credit_card_installment_terms_raw: z.string().nullish(),
		whitelist_bins_raw: z.string().nullish(),
		priority_card_feature: z.unknown().nullish(),

		// Flat virtual-account configuration
		bca_va_number: z.string().nullish(),
		bca_va_inquiry_text_raw: z.string().nullish(),
		bca_va_payment_text_raw: z.string().nullish(),
		bni_va_number: z.string().nullish(),
		permata_va_number: z.string().nullish(),
		permata_va_recipient: z.string().nullish(),
		bri_va_number: z.string().nullish(),
		cimb_va_number: z.string().nullish(),
		danamon_va_number: z.string().nullish(),
		bsi_va_number: z.string().nullish(),
		seabank_va_number: z.string().nullish(),
		custom_va_number: z.string().nullish(),

		// Callbacks
		finish_callback_url: z.string().nullish(),
		unfinish_callback_url: z.string().nullish(),
		error_callback_url: z.string().nullish(),
		close_callback_url: z.string().nullish(),

		// Display helpers
		locale_amount: z.string().optional(),
		currency_sign: z.string().optional(),
		locale_amount_with_prefix: z.string().optional(),

		// Misc metadata
		metadata: z.string().nullish(),
		custom_field1: z.union([z.string(), z.number()]).nullish(),
		custom_field2: z.union([z.string(), z.number()]).nullish(),
		custom_field3: z.union([z.string(), z.number()]).nullish(),
		title: z.string().nullish(),
		require_customer_detail_settings: z.string().optional(),
		last_snap_transaction_status: z.string().nullish(),
		last_snap_token: z.string().nullish(),
		bulk_upload_id: z.union([z.string(), z.number()]).nullish(),
		source: z.string().optional(),
		service: z.string().optional(),
		source_version: z.string().optional(),
		payment_settings: z.unknown().nullish(),
		dynamic_amount: z.unknown().nullish(),

		// Timestamps (both casings are returned)
		created_at: z.string().optional(),
		updated_at: z.string().optional(),
		deleted_at: z.string().nullish(),
		canceled_at: z.string().nullish(),
		epoch_deleted_at: z.number().optional(),
		createdAt: z.string().optional(),
		updatedAt: z.string().optional(),
		deletedAt: z.string().nullish(),
	})
	.meta({ id: "MidtransPaymentLinkDetailResponse" });

export type PaymentLinkDetailResponse = z.infer<
	typeof PaymentLinkDetailResponseSchema
>;

/** @deprecated Use {@link PaymentLinkDetailResponse}. */
export type PaymentLinkDetail = PaymentLinkDetailResponse;
