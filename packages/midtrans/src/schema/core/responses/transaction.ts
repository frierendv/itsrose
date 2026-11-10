import { z } from "zod/v4";
import { MetadataSchema } from "../../primitives/metadata";
import {
	PaymentActionSchema,
	PaymentAmountSchema,
	VaNumberSchema,
} from "../../primitives/payment-actions";
import { CstoreStoreSchema } from "../../primitives/payment/over-the-counter";
import {
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
} from "../../primitives/transaction-status";
import { PaymentTypeSchema } from "../payment";
import { QrisAcquirerSchema } from "../payment/ewallet/qris";

/**
 * Fields shared by every Core API transaction response.
 */
const transactionBaseFields = {
	/**
	 * Business status code (e.g. `"200"`, `"201"`, `"407"`).
	 */
	status_code: z.string(),
	/** Human readable status description. */
	status_message: z.string(),
	/** Midtrans unique transaction identifier (UUID). */
	transaction_id: z.string(),
	/** Merchant unique order identifier. */
	order_id: z.string(),
	/** Midtrans merchant ID. */
	merchant_id: z.string().optional(),
	/** Gross amount formatted as a decimal string (e.g. `"15000.00"`). */
	gross_amount: z.string(),
	/** Transaction currency code (`"IDR"`). */
	currency: z.string(),
	/** Payment channel used for this transaction. */
	payment_type: PaymentTypeSchema,
	/** Timestamp in `YYYY-MM-DD HH:mm:ss` format. */
	transaction_time: z.string(),
	/** Transaction lifecycle status. */
	transaction_status: TransactionStatusSchema,
	/** Fraud detection status. */
	fraud_status: TransactionFraudStatusSchema,
	/**
	 * SHA-512 notification signature.
	 *
	 * Only present on status lookups and notifications, not on charge
	 * responses.
	 */
	signature_key: z.string().optional(),
	/** Expiry timestamp in `YYYY-MM-DD HH:mm:ss` format. */
	expiry_time: z.string().optional(),
	/** Settlement timestamp in `YYYY-MM-DD HH:mm:ss` format. */
	settlement_time: z.string().optional(),
	/** Partial payments recorded for this transaction. */
	payment_amounts: z.array(PaymentAmountSchema).optional(),
	/** Arbitrary transaction metadata. */
	metadata: MetadataSchema.optional(),
} satisfies z.ZodRawShape;

/**
 * Optional channel-specific fields used by the loose lifecycle response.
 */
const channelFields = {
	va_numbers: z.array(VaNumberSchema).optional(),
	permata_va_number: z.string().optional(),
	bill_key: z.string().optional(),
	biller_code: z.string().optional(),
	store: CstoreStoreSchema.optional(),
	payment_code: z.string().optional(),
	actions: z.array(PaymentActionSchema).optional(),
	qr_string: z.string().optional(),
	acquirer: z.string().optional(),
	channel_response_code: z.string().optional(),
	channel_response_message: z.string().optional(),
	saved_token_id: z.string().optional(),
	masked_card: z.string().optional(),
	card_type: z.string().optional(),
	bank: z.string().optional(),
	approval_code: z.string().optional(),
	eci: z.string().optional(),
	three_ds_version: z.string().optional(),
	challenge_completion: z.boolean().optional(),
	on_us: z.boolean().optional(),
	installment_term: z.number().int().optional(),
	/**
	 * 3D Secure challenge URL.
	 *
	 * Only returned when the card charge requires 3DS authentication; the
	 * transaction stays `pending` until the challenge is completed.
	 */
	redirect_url: z.url().optional(),
} satisfies z.ZodRawShape;

/**
 * Transaction response for lifecycle endpoints.
 *
 * Lifecycle responses (`status`, `expire`, `cancel`, `refund`, …) may omit
 * channel-specific fields that are present on the original charge, so every
 * channel field is optional here.
 */
export const CoreTransactionResponseSchema = z
	.object({
		...transactionBaseFields,
		...channelFields,
	})
	.meta({
		id: "MidtransCoreTransactionResponse",
	});

export type CoreTransactionResponse = z.infer<
	typeof CoreTransactionResponseSchema
>;

export const CoreChargeResponseSchema = z.discriminatedUnion("payment_type", [
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("bank_transfer"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("echannel"),
		bill_key: z.string(),
		biller_code: z.string(),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("credit_card"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("cstore"),
		store: CstoreStoreSchema,
		payment_code: z.string(),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("qris"),
		qr_string: z.string(),
		acquirer: QrisAcquirerSchema,
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("gopay"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("ovo"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("shopeepay"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("akulaku"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("kredivo"),
	}),
]);

export type CoreChargeResponse = z.infer<typeof CoreChargeResponseSchema>;

/**
 * @deprecated Use {@link CoreTransactionResponseSchema}.
 */
export const ResponseTransactionSchema = CoreTransactionResponseSchema;
export type ResponseTransaction = CoreTransactionResponse;

/**
 * @deprecated Use {@link CoreTransactionResponseSchema}.
 */
export const ResponseTransactionBaseSchema = CoreTransactionResponseSchema;
export type ResponseTransactionBase = CoreTransactionResponse;

/**
 * @deprecated Use {@link CoreChargeResponseSchema}.
 */
export const ResponseTransactionTypeFieldsSchema = CoreChargeResponseSchema;
export type ResponseTransactionTypeFields = CoreChargeResponse;
