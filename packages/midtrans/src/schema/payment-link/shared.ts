import { z } from "zod/v4";
import {
	Callbacks,
	CustomerDetails,
	CustomFields,
	ItemDetails,
	PaymentChannels,
	PaymentLinkSupportedBank,
	SnapExpiry,
	TimestampFields,
	TransactionDetails,
} from "../common";
import { BCAExclusiveFreeTextSchema } from "../core";

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

export const PaymentLinkCustomerDetail = CustomerDetails.omit({
	billing_address: true,
	shipping_address: true,
})
	.extend({
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

export const PaymentLinkTransactionDetail = TransactionDetails.extend({
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

export const PaymentLinkItemDetail = ItemDetails;
export const PaymentLinkExpiry = SnapExpiry;
export const PaymentLinkCallback = Callbacks;
export const PaymentLinkCustomFields = CustomFields;
export const PaymentLinkPaymentChannels = PaymentChannels;
export const PaymentLinkTimestampFields = TimestampFields;

// ---- types f
export type PaymentLinkBank = z.infer<typeof PaymentLinkBank>;
export type PaymentLinkCustomerDetail = z.infer<
	typeof PaymentLinkCustomerDetail
>;
export type PaymentLinkTransactionDetail = z.infer<
	typeof PaymentLinkTransactionDetail
>;
