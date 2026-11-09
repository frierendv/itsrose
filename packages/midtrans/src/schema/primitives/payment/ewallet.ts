import { z } from "zod/v4";

export const PaymentEwalletSchema = z.enum([
	"dana",
	"gopay",
	"ovo",
	"shopeepay",
]);
export type PaymentEwallet = z.infer<typeof PaymentEwalletSchema>;
