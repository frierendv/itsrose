import { z } from "zod/v4";

export const CreditCardRouteChannelSchema = z.enum([
	"dragon",
	"mti",
	"migs",
	"cybersource",
	"braintree",
	"mpgs",
]);
export type CreditCardRouteChannel = z.infer<
	typeof CreditCardRouteChannelSchema
>;
