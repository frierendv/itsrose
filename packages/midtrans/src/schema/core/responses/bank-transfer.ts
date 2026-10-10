import { z } from "zod/v4";
import { BankTransferFieldsSchema, PaymentTypeSchema } from "../payment";

export const ResponseBankTransferSchema = z.object({
	payment_type: PaymentTypeSchema.extract(["bank_transfer"]),
	va_numbers: z.array(BankTransferFieldsSchema),
});

export type ResponseBankTransfer = z.infer<typeof ResponseBankTransferSchema>;
