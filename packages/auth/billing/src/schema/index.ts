import { apiPlanSchema } from "./api-plan";
import { invoiceSchema } from "./invoice";
import { subscriptionSchema } from "./subscription";
import { tenantSchema } from "./tenancy";

export * from "./api-plan";
export * from "./invoice";
export * from "./subscription";
export * from "./tenancy";

export const billingSchema = {
	...invoiceSchema,
	...apiPlanSchema,
	...subscriptionSchema,
	...tenantSchema,
};

/** @deprecated Use {@link billingSchema}. */
export const itsRoseSchema = billingSchema;
