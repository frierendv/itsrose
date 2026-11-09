import { z } from "zod/v4";
import { BankCodeSchema } from "../../../primitives";

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
