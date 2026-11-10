import { z } from "zod/v4";
import {
	CstoreStoreSchema,
	PaymentActionSchema,
	PaymentAmountSchema,
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
	VaNumberSchema,
} from "../primitives";
import { PaymentTypeSchema } from "./request";

/* ----------------------- Base Transaction Response Fields ----------------------- */

const transactionBaseFields = {
	status_code: z.string(),
	status_message: z.string(),
	transaction_id: z.string(),
	order_id: z.string(),
	merchant_id: z.string().optional(),
	gross_amount: z.string(),
	currency: z.string().default("IDR"),
	payment_type: PaymentTypeSchema,
	transaction_time: z.string(),
	transaction_status: TransactionStatusSchema,
	fraud_status: TransactionFraudStatusSchema.optional(),
	signature_key: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional(),
	/** Expiry timestamp in `YYYY-MM-DD HH:mm:ss` format. */
	expiry_time: z.string().optional(),
	/** Settlement timestamp in `YYYY-MM-DD HH:mm:ss` format. */
	settlement_time: z.string().optional(),
	payment_amounts: z.array(PaymentAmountSchema).optional(),
} satisfies z.ZodRawShape;

/* ----------------------- Channel-specific Response Fields ----------------------- */

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

/**
 * Discriminated union of charge responses for every supported payment channel.
 */
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
		bank: z.string(),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("cstore"),
		payment_code: z.string(),
		store: CstoreStoreSchema,
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("gopay"),
		actions: z.array(PaymentActionSchema),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("ovo"),
	}),
	z.object({
		...transactionBaseFields,
		...channelFields,
		payment_type: z.literal("qris"),
		actions: z.array(PaymentActionSchema),
		qr_string: z.string(),
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
 * Response of `GET /v2/{order_id}/status/b2b`.
 */
export const CoreStatusB2BResponseSchema = z
	.object({
		status_code: z.string(),
		status_message: z.string(),
		transactions: z.array(CoreTransactionResponseSchema),
	})
	.meta({
		id: "MidtransCoreStatusB2BResponse",
	});

export type CoreStatusB2BResponse = z.infer<typeof CoreStatusB2BResponseSchema>;

/* --------------------------- Deprecated Aliases --------------------------- */

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
