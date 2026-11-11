import { z } from "zod/v4";
import {
	CustomerDetailsSchema,
	CustomExpirySchema,
	CustomFieldsSchema,
	MetadataSchema,
	TransactionDetailsSchema,
} from "../primitives";
import {
	BankTransferFieldsSchema,
	CreditCardFieldsSchema,
	GopayFieldsSchema,
	GopayPaymentProviderMetadataSchema,
	MandiriEchannelFieldsSchema,
	OverTheCounterSchema,
	OvoFieldsSchema,
	QrisFieldsSchema,
	ShopeepayFieldsSchema,
} from "./channels";

/* ------------------------------- Item Fields ------------------------------ */

/**
 * Item details
 */
export const PaymentItemFieldsSchema = z
	.object({
		/** Item unique identifier. */
		id: z.string().min(1).max(40),
		/** Price of the item in `IDR`. */
		price: z.int().positive(),
		/** Quantity of the item purchased by the customer. */
		quantity: z.int().positive(),
		/** Name for this item. */
		name: z.string().max(50),
		/** Item Brand. */
		brand: z.string().max(50),
		/** Item Category. */
		category: z.string().max(50),
		/** Merchant name that selling this item. */
		merchant_name: z.string().max(100),
		/** HTTP URL of the item in the merchant site. */
		url: z.url(),
	})
	.partial()
	.required({ price: true, quantity: true, name: true });

export type PaymentItemFields = z.infer<typeof PaymentItemFieldsSchema>;

/* ------------------------------- Payment Type ----------------------------- */

export const PaymentTypeSchema = z.enum([
	"bank_transfer",
	"echannel",
	"credit_card",
	"cstore",
	"gopay",
	"ovo",
	"shopeepay",
	"qris",
	"akulaku",
	"kredivo",
]);
export type PaymentType = z.infer<typeof PaymentTypeSchema>;

export const PaymentTypeFieldsSchema = z.discriminatedUnion("payment_type", [
	// bank or mandiri echannel
	z.object({
		payment_type: PaymentTypeSchema.extract(["bank_transfer"]),
		bank_transfer: BankTransferFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["echannel"]),
		echannel: MandiriEchannelFieldsSchema,
	}),
	// credit card
	z.object({
		payment_type: PaymentTypeSchema.extract(["credit_card"]),
		credit_card: CreditCardFieldsSchema,
	}),
	// over the counter
	z.object({
		payment_type: PaymentTypeSchema.extract(["cstore"]),
		cstore: OverTheCounterSchema,
	}),
	// ewallets
	z.object({
		payment_type: PaymentTypeSchema.extract(["gopay"]),
		gopay: GopayFieldsSchema,
		/**
		 * Object containing the payment provider’s metadata parameter.
		 * This is used whenever merchant needs to pass additional information to payment provider.
		 * Your sales representative will inform you if you need to pass information.
		 *
		 * @link https://docs.midtrans.com/reference/gopay-tokenization
		 */
		payment_provider_metadata: GopayPaymentProviderMetadataSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["ovo"]),
		ovo: OvoFieldsSchema,
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["qris"]),
		qris: QrisFieldsSchema.optional(),
	}),
	z.object({
		payment_type: PaymentTypeSchema.extract(["shopeepay"]),
		shopeepay: ShopeepayFieldsSchema,
	}),
]);
export type PaymentTypeFields = z.infer<typeof PaymentTypeFieldsSchema>;

/* ------------------------------ Payment Fields ---------------------------- */

export const PaymentFieldsSchema = z
	.object({
		/** Transaction details. */
		transaction_details: TransactionDetailsSchema,
		/** Representing a purchased product or fee/discount line. */
		item_details: z.array(PaymentItemFieldsSchema).optional(),
		/** Customer details. */
		customer_details: CustomerDetailsSchema.optional(),
		/**
		 * Set an expiry time for the payment of every transaction with `transaction_status:pending`
		 *
		 * The transaction is rejected if the custom expiry exceeds the allowed maximum time.
		 */
		custom_expiry: CustomExpirySchema.optional(),
		/**
		 * A free-form JSON object.
		 *
		 * You can use this metadata as a transaction tag and
		 * retrieve it using Get Status or HTTP Notifications URL.
		 */
		metadata: MetadataSchema.optional(),
	})
	.and(PaymentTypeFieldsSchema)
	.and(CustomFieldsSchema);

export type PaymentFields = z.infer<typeof PaymentFieldsSchema>;

/* ----------------------------- Charge Request ----------------------------- */

export const CorePaymentChargeRequestSchema = PaymentFieldsSchema;
export type CorePaymentChargeRequest = PaymentFields;

/* ----------------------------- Refund Request ----------------------------- */

export const CorePaymentRefundRequestSchema = z.object({
	/** Merchant idempotency key to prevent double refunds. */
	refund_key: z.string().min(1).max(50).optional(),
	/** Refund amount in IDR. Omit for full refund. */
	amount: z.number().int().positive().optional(),
	/** Reason for issuing the refund. */
	reason: z.string().max(255),
});
export type CorePaymentRefundRequest = z.infer<
	typeof CorePaymentRefundRequestSchema
>;

/* ---------------------------- Capture Request ----------------------------- */

/**
 * Payload for capturing an authorized card transaction.
 *
 * `POST /v2/capture`
 */
export const CoreCaptureRequestSchema = z.object({
	/** Midtrans transaction identifier returned by the charge request. */
	transaction_id: z.string(),
});
export type CoreCaptureRequest = z.infer<typeof CoreCaptureRequestSchema>;

/**
 * Body of `/v2/{order_id}/refund/online/direct`.
 *
 * The direct-refund endpoint accepts the same fields as a regular refund.
 */
export type CoreDirectRefundRequest = CorePaymentRefundRequest;
