import { z } from "zod/v4";
import { BCAExclusiveFreeTextSchema } from "../core";
import {
	CallbacksSchema,
	CustomFieldsSchema,
	ItemDetailsSchema,
	PaymentChannels,
	PaymentLinkSupportedBank,
	TimestampFieldsSchema,
	TransactionDetailsSchema,
} from "../shared";

export const PaymentLinkBankDetail = z.object({ number: z.string() });
export const PaymentLinkBank = z
	.partialRecord(
		PaymentLinkSupportedBank.exclude(["bca_va", "permata_va"]),
		PaymentLinkBankDetail
	)
	.and(
		z.partialRecord(
			PaymentLinkSupportedBank.extract(["bca_va"]),
			PaymentLinkBankDetail.extend({
				/** `bca_va` exclusive field */
				free_text: BCAExclusiveFreeTextSchema.optional(),
			})
		)
	)
	.and(
		z.partialRecord(
			PaymentLinkSupportedBank.extract(["permata_va"]),
			PaymentLinkBankDetail.extend({
				/** `permata_va` exclusive field */
				recipient_name: z.string().max(25).optional(),
			})
		)
	);

export const PaymentLinkCustomerDetail = z
	.object({
		first_name: z.string().max(50),
		last_name: z.string().max(50),
		email: z.email().max(255),
		phone: z.string().max(15),
		notes: z.string().max(255).optional(),
		customer_details_required_fields: z
			.array(z.enum(["first_name", "email", "phone"]))
			.optional(),
	})
	.required({
		first_name: true,
		last_name: true,
		email: true,
		phone: true,
	});

export const PaymentLinkTransactionDetail = TransactionDetailsSchema.extend({
	/**
	 * Unique Link id that will be used as part of the resulting payment URL.
	 *
	 * A single id could be used only once.
	 *
	 * Note: Only lowercase alphanumeric characters and hyphens are allowed
	 */
	payment_link_id: z
		.string()
		.max(50)
		.regex(
			/^[a-z0-9-]+$/,
			"Only lowercase alphanumeric characters and hyphens are allowed"
		)
		.optional(),
});

/**
 * Payment Link expiry unit.
 *
 * The API returns plural forms (`months`) for the default expiry, while the
 * request accepts both singular and plural units.
 */
export const PaymentLinkExpiryUnitSchema = z.enum([
	"second",
	"seconds",
	"minute",
	"minutes",
	"hour",
	"hours",
	"day",
	"days",
	"week",
	"weeks",
	"month",
	"months",
]);

export type PaymentLinkExpiryUnit = z.infer<typeof PaymentLinkExpiryUnitSchema>;

/**
 * Expiry configuration for a payment link.
 */
export const PaymentLinkExpirySchema = z
	.object({
		start_time: z.string().optional(),
		duration: z.int(),
		unit: PaymentLinkExpiryUnitSchema,
	})
	.meta({ id: "MidtransPaymentLinkExpiry" });

export type PaymentLinkExpiry = z.infer<typeof PaymentLinkExpirySchema>;

/**
 * @deprecated Use {@link PaymentLinkExpirySchema}.
 */
export const PaymentLinkExpiry = PaymentLinkExpirySchema;

export const PaymentLinkItemDetail = ItemDetailsSchema;
export const PaymentLinkCallback = CallbacksSchema;
export const PaymentLinkCustomFields = CustomFieldsSchema;
export const PaymentLinkPaymentChannels = PaymentChannels;
export const PaymentLinkTimestampFields = TimestampFieldsSchema;

// ---- types f
export type PaymentLinkBank = z.infer<typeof PaymentLinkBank>;
export type PaymentLinkCustomerDetail = z.infer<
	typeof PaymentLinkCustomerDetail
>;
export type PaymentLinkTransactionDetail = z.infer<
	typeof PaymentLinkTransactionDetail
>;
export type PaymentLinkItemDetail = z.infer<typeof PaymentLinkItemDetail>;
