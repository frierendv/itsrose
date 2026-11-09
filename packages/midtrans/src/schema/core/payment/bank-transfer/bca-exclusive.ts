import { z } from "zod/v4";
import { BankCodeSchema } from "../../../primitives";
import { BankTransferBaseFieldsSchema } from "./bank-transfer-base";

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
