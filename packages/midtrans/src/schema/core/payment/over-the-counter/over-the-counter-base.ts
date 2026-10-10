import { z } from "zod/v4";
import { PaymentChannelOverTheCounterSchema } from "../../../shared";

export const OverTheCounterBaseSchema = z.object({
	/**
	 * Convenience store retail partner.
	 */
	store: PaymentChannelOverTheCounterSchema,
	/**
	 * Message displayed on the payment slip or cashier POS.
	 */
	message: z.string().max(50).optional(),
});
export type OverTheCounterBase = z.infer<typeof OverTheCounterBaseSchema>;
