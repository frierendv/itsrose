import { z } from "zod/v4";
import { BankTransferBaseFieldsSchema } from "./bank-transfer-base";
import { BankTransferBCAExclusiveFieldsSchema } from "./bca-exclusive";
import { BankTransferPermataExclusiveFieldsSchema } from "./permata-exclusive";

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
