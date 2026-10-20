import { apiPlanSchema } from "./api-plan";
import { invoiceSchema } from "./invoice";
import { subscriptionSchema } from "./subscription";

export * from "./api-plan";
export * from "./invoice";
export * from "./subscription";

export const itsRoseSchema = {
	...invoiceSchema,
	...apiPlanSchema,
	...subscriptionSchema,
};
