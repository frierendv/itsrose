import { z } from "zod/v4";
import { BankCodeSchema } from "../../../shared";
import { BankTransferBaseFieldsSchema } from "./bank-transfer-base";

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
