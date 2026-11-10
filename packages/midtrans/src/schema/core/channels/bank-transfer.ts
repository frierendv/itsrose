import { z } from "zod/v4";
import { BankCodeSchema } from "../../primitives";

/**
 * Bank transfer specific parameters for Virtual Accounts.
 *
 * Related fields to `bank_transfer`.
 */
export const BankTransferBaseFieldsSchema = z.object({
	/**
	 * Target bank for virtual account generation.
	 *
	 * By default it only support "bca", "bni", "bri", "cimb" and "permata".
	 */
	bank: BankCodeSchema.exclude(["bca", "permata"]),
	/**
	 * Custom VA number (if supported by bank/account)
	 */
	va_number: z.string().max(30).optional(),
});
export type BankTransferBaseFields = z.infer<
	typeof BankTransferBaseFieldsSchema
>;

/**
 * Free text displayed on BCA ATM or mobile banking inquiry and payment screens.
 */
export const BCAExclusiveFreeTextSchema = z.object({
	inquiry: z
		.array(
			z.object({
				en: z.string().max(25),
				id: z.string().max(25),
			})
		)
		.max(5)
		.optional(),
	payment: z
		.array(
			z.object({
				en: z.string().max(25),
				id: z.string().max(25),
			})
		)
		.max(5)
		.optional(),
});
export type BCAExclusiveFreeText = z.infer<typeof BCAExclusiveFreeTextSchema>;

/**
 * Bank BCA exclusive.
 */
export const BankTransferBCAExclusiveFieldsSchema =
	BankTransferBaseFieldsSchema.extend({
		bank: BankCodeSchema.extract(["bca"]),
		free_text: BCAExclusiveFreeTextSchema.optional(),
		bca: z
			.object({
				/**
				 * BCA sub company code directed for this transactions.
				 *
				 * Defaults `0000`
				 */
				sub_company_code: z.string().max(10).optional(),
			})
			.optional(),
	});
export type BankTransferBCAExclusiveFields = z.infer<
	typeof BankTransferBCAExclusiveFieldsSchema
>;

/**
 * Bank permata exclusive.
 */
export const BankTransferPermataExclusiveFieldsSchema =
	BankTransferBaseFieldsSchema.extend({
		bank: BankCodeSchema.extract(["permata"]),
		permata: z
			.object({
				/**
				 * Recipient name shown on the payment details.
				 * It is shown as 20 characters uppercase string.
				 *
				 * Default is merchant name.
				 */
				recipient_name: z.string().max(30).optional(),
			})
			.optional(),
	});
export type BankTransferPermataExclusive = z.infer<
	typeof BankTransferPermataExclusiveFieldsSchema
>;

/**
 * Mandiri Bill Payment parameters.
 */
export const MandiriEchannelFieldsSchema = z
	.object({
		/** Label 1. */
		bill_info1: z.string().max(10),
		/** Label 2. */
		bill_info2: z.string().max(30),
		/** Label 3. */
		bill_info3: z.string().max(10),
		/** Label 4. */
		bill_info4: z.string().max(30),
		/** Label 5. */
		bill_info5: z.string().max(10),
		/** Label 6. */
		bill_info6: z.string().max(30),
		/** Label 7. */
		bill_info7: z.string().max(10),
		/** Label 8. */
		bill_info8: z.string().max(30),
		/** Custom bill key identifier assigned by the merchant (6–12 digits). */
		bill_key: z.string().min(6).max(12),
	})
	.partial()
	.required({ bill_info1: true, bill_info2: true });
export type MandiriEchannelFields = z.infer<typeof MandiriEchannelFieldsSchema>;

/**
 * Bank transfer specific parameters for Virtual Accounts.
 *
 * Related fields to `bank_transfer`.
 */
export const BankTransferFieldsSchema = z.discriminatedUnion("bank", [
	BankTransferBaseFieldsSchema,
	BankTransferBCAExclusiveFieldsSchema,
	BankTransferPermataExclusiveFieldsSchema,
]);
export type BankTransferFields = z.infer<typeof BankTransferFieldsSchema>;
