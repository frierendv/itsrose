import { z } from "zod/v4";
import { PaymentChannelBankVaSchema } from "./bank";
import { PaymentEwalletSchema } from "./ewallet";
import { PaymentChannelOverTheCounterSchema } from "./over-the-counter";

export const PaymentChannelSchema = z.union([
	z.union([PaymentChannelBankVaSchema, z.literal("bank_transfer")]),
	PaymentEwalletSchema,
	z.union([PaymentChannelOverTheCounterSchema, z.literal("cstore")]),
]);
export type PaymentChannel = z.infer<typeof PaymentChannelSchema>;
