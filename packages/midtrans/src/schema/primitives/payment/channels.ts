import { z } from "zod/v4";
import { VaBankSchema } from "./bank";
import { PaymentEwalletSchema } from "./ewallet";
import { CstoreStoreSchema } from "./over-the-counter";

export const PaymentChannelSchema = z.union([
	z.union([VaBankSchema, z.literal("bank_transfer")]),
	PaymentEwalletSchema,
	z.union([CstoreStoreSchema, z.literal("cstore")]),
]);

export type PaymentChannel = z.infer<typeof PaymentChannelSchema>;
