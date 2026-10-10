import { z } from "zod/v4";

export const PaymentChannelOverTheCounterSchema = z.enum([
	"alfamart",
	"indomaret",
]);
export type PaymentChannelOverTheCounter = z.infer<
	typeof PaymentChannelOverTheCounterSchema
>;
