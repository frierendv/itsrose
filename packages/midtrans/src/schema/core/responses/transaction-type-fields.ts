import { z } from "zod/v4";
import { ResponseBankTransferSchema } from "./bank-transfer";
import { ResponseCreditCardSchema } from "./credit-card";

export const ResponseTransactionTypeFieldsSchema = z.discriminatedUnion(
	"payment_type",
	[ResponseBankTransferSchema, ResponseCreditCardSchema]
);

export type ResponseTransactionTypeFields = z.infer<
	typeof ResponseTransactionTypeFieldsSchema
>;
