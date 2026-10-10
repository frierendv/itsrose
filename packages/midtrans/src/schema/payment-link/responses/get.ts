import { z } from "zod/v4";
import {
	PaymentLinkCustomerDetail,
	PaymentLinkExpiry,
	PaymentLinkItemDetail,
	PaymentLinkPaymentChannels,
	PaymentLinkTimestampFields,
} from "../shared";

/**
 * Mostly available/exist in response object.
 */
export const PaymentLinkDetail = z
	.object({
		/** id of this payment link */
		id: z.string().or(z.number()),
		order_id: z.string(),
		payment_link_type: z.enum(["FIXED_AMOUNT", "DYNAMIC_AMOUNT"]),
		merchant_id: z.string(),
		/**
		 * Payment link id, refers to last part of payment link URL.
		 *
		 * E.g. https://app.midtrans.com/payment-links/abc, payment link id refers to `abc`.
		 */
		payment_link_id: z.string(),
		/**
		 * Maximum usage of payment link.
		 */
		usage_limit: z.number(),
		/**
		 * Current count of payment link usage
		 */
		usage: z.number(),
		/**
		 * Transaction amount.
		 */
		gross_amount: z.number().positive(),
		/**
		 * List of payment methods that are enabled for this payment link.
		 */
		enabled_payments: z
			.array(PaymentLinkPaymentChannels)
			.transform((channels) =>
				channels.filter(
					(channel) =>
						PaymentLinkPaymentChannels.safeParse(channel).success
				)
			),
		/**
		 * Transaction's item details.
		 */
		item_details: z
			.object({
				id: z.string().or(z.number()),
			})
			.extend(
				PaymentLinkItemDetail.omit({
					brand: true,
					category: true,
					merchant_name: true,
				}).shape
			)
			.extend({
				brand: PaymentLinkItemDetail.shape.brand.nullable(),
				category: PaymentLinkItemDetail.shape.brand.nullable(),
				merchant_name: PaymentLinkItemDetail.shape.brand.nullable(),
				payment_link_id: z.string().or(z.int()),
			})
			.required()
			.extend({
				// test
				PaymentLinkId: z.string().or(z.int()).optional(),
			})
			.and(PaymentLinkTimestampFields.omit({ deletedAt: true }))
			.array(),
		/**
		 * Details of customer of each transactions.
		 */
		customer_details: z
			.object({
				id: z.string().or(z.int()),
				user_id: z.union([z.string(), z.int()]).nullable(),
				/**
				 * Customer full name `(first_name + last_name)`
				 */
				full_name: z.string(),
			})
			.extend(
				Object.fromEntries(
					Object.entries(PaymentLinkCustomerDetail.shape).map(
						([key, schema]) => [key, schema.nullable()]
					)
				) as {
					[
						K in keyof typeof PaymentLinkCustomerDetail.shape
					]: z.ZodNullable<
						(typeof PaymentLinkCustomerDetail.shape)[K]
					>;
				}
			)
			.required()
			.extend({
				address: z.string().nullish(),
				address_city: z.string().nullish(),
				address_postal: z.string().nullish(),
				address_country: z.string().nullish(),
				PaymentLinkId: z.union([z.string(), z.int()]).nullish(),
			})
			.omit({ customer_details_required_fields: true })
			.and(PaymentLinkTimestampFields.omit({ deletedAt: true })),
		/**
		 * Payment link's expiry duration.
		 */
		expiry: PaymentLinkExpiry.required(),
		purchases: z
			.object({
				id: z.string().or(z.number()),
				transaction_id: z.string(),
				order_id: z.string(),

				snap_token: z.string(),
				payment_status: z.string(),
				payment_method: z.string(),
				payment_link_id: z.string().or(z.int()),

				acquirer: z.string(),
				amount_value: z.int(),
				amount_currency: z.string(),
				expiry_time: z.string(),
			})
			.array(),
	})
	.meta({ id: "MidtransPaymentLinkDetailBase" });

export const PaymentLinkDetailExtended = z
	.object({
		metadata: z.string(),
		currency: z.literal("IDR").or(z.string()),
		locale_amount: z.string(),
		currency_sign: z.string(),
		locale_amount_with_prefix: z.string(),

		virtual_account: z.any(),

		custom_field1: z.union([z.string(), z.int()]).nullable(),
		custom_field2: z.union([z.string(), z.int()]).nullable(),
		custom_field3: z.union([z.string(), z.int()]).nullable(),
	})
	.meta({ id: "MidtransPaymentLinkDetailExtended" });
export const PaymentLinkDetailPartialExtended = z
	.object({
		enabled_payments_raw: z.string(),

		/* ---- Credit card field */
		credit_card_3d_secure: z.boolean(),
		credit_card_type: z.string(),
		credit_card_bank: z.string().nullable(),
		credit_card_installment_required: z.boolean(),
		credit_card_installment_disabled: z.boolean(),
		priority_card_feature: z.any().nullable(),
		credit_card_installment_terms_raw: z.string().nullable(),
		whitelist_bins_raw: z.string().nullable(),

		/* ---- Bank field */
		bca_va_number: z.string().nullable(),
		bca_va_inquiry_text_raw: z.string().nullable(),
		bca_va_payment_text_raw: z.string().nullable(),
		bni_va_number: z.string().nullable(),
		permata_va_number: z.string().nullable(),
		permata_va_recipient: z.string().nullable(),
		bri_va_number: z.string().nullable(),
		cimb_va_number: z.string().nullable(),
		danamon_va_number: z.string().nullable(),
		bsi_va_number: z.string().nullable(),
		seabank_va_number: z.string().nullable(),
		custom_va_number: z.string().nullable(),

		/* ---- Callback field */
		finish_callback_url: z.string().nullable(),
		unfinish_callback_url: z.string().nullable(),
		error_callback_url: z.string().nullable(),
		close_callback_url: z.string().nullable(),

		/* ---- Customer field */
		first_name_required: z.boolean(),
		email_required: z.boolean(),
		phone_required: z.boolean(),

		/* ---- Midtrans service related field */
		source: z.any(),
		service: z.any(),
		source_version: z.any(),

		/* ---- Undocumented field */

		dynamic_amount: z.any().nullish(),
		payment_settings: z.any().nullish(),
	})
	.partial()
	.meta({ id: "MidtransPaymentLinkDetailPartialExtended" });

/**
 * Purchase record for a payment link.
 */
export const PaymentLinkPurchaseDetail = z
	.object({
		id: z.string().or(z.number()),
		transaction_id: z.string(),
		order_id: z.string(),

		snap_token: z.string(),
		payment_status: z.string(),
		payment_method: z.string(),
		payment_link_id: z.string().or(z.int()),

		acquirer: z.string(),
		amount_value: z.int(),
		amount_currency: z.string(),
		expiry_time: z.string(),
	})
	.and(PaymentLinkTimestampFields.omit({ deletedAt: true }))
	.meta({ id: "MidtransPaymentLinkPurchaseDetail" });

/**
 * Details of an existing payment link.
 *
 * `GET /v1/payment-links/{orderId}`
 */
export const PaymentLinkDetailResponse = PaymentLinkDetail.extend(
	PaymentLinkDetailExtended.shape
)
	.extend(PaymentLinkDetailPartialExtended.shape)
	.meta({
		id: "MidtransPaymentLinkDetailResponse",
	});

/* ---- Types --- */
export type PaymentLinkDetail = z.infer<typeof PaymentLinkDetail>;
export type PaymentLinkPurchaseDetail = z.infer<
	typeof PaymentLinkPurchaseDetail
>;
export type PaymentLinkDetailExtended = z.infer<
	typeof PaymentLinkDetailExtended
>;
export type PaymentLinkDetailPartialExtended = z.infer<
	typeof PaymentLinkDetailPartialExtended
>;
export type PaymentLinkDetailResponse = z.infer<
	typeof PaymentLinkDetailResponse
>;
