import { z } from "zod/v4";
import type { Prettify } from "../../helper";
import { type PaymentChannelBank } from "../../shared";
import { CreditCardRouteChannelSchema, PaymentTypeSchema } from "../payment";

export const ResponseCreditCardSchema = z.object({
	payment_type: PaymentTypeSchema.extract(["credit_card"]),
	channel_response_code: z.string(),
	channel_response_message: z.string(),
	bank: z.string(),
	approval_code: z.string(),
	masked_card: z.string(),
	card_type: z.string(),
	channel: CreditCardRouteChannelSchema,

	on_us: z.boolean().optional(),
	three_ds_version: z.string().optional(),
	challenge_completion: z.boolean().optional(),
	eci: z.string().optional(),
});
export type ResponseCreditCardSchema = Omit<
	z.infer<typeof ResponseCreditCardSchema>,
	"bank"
> & {
	bank: PaymentChannelBank | (string & {});
};

export type ResponseCreditCard = Prettify<ResponseCreditCardSchema>;
