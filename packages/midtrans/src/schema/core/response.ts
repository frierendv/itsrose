import { z } from "zod/v4";
import { deepNullish } from "../helper";
import { CorePaymentChargeRequestSchema } from "./request";

export const CorePaymentResponseSchema = z
	.object({})
	.and(deepNullish(CorePaymentChargeRequestSchema));

export type CorePaymentResponse = z.infer<typeof CorePaymentResponseSchema>;
