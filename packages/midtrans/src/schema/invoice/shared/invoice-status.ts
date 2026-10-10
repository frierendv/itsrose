import { z } from "zod/v4";

export const InvoiceStatusSchema = z.enum([
	"draft",
	"pending",
	"published",
	"expired",
	"overdue",
	"paid",
	"voided",
	"rejected",
	"canceled",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
