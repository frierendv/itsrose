import { z } from "zod/v4";

export const InvoiceWebhookCustomerDetailsSchema = z.object({
	full_name: z.string().nullish(),
	email: z.string().nullish(),
	phone: z.string().nullish(),
});
export type InvoiceWebhookCustomerDetails = z.infer<
	typeof InvoiceWebhookCustomerDetailsSchema
>;
