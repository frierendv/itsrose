import { z } from "zod/v4";
import { ResponseTransactionBaseSchema } from "./transaction-base";
import { ResponseTransactionTypeFieldsSchema } from "./transaction-type-fields";

export const ResponseTransactionSchema = ResponseTransactionBaseSchema.and(
	ResponseTransactionTypeFieldsSchema
);

export type ResponseTransaction = z.infer<typeof ResponseTransactionSchema>;
