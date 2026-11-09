import { z } from "zod/v4";
import { PaymentTypeSchema } from "../../core";
import {
	TransactionFraudStatusSchema,
	TransactionStatusSchema,
} from "../../primitives";
import { InvoiceMetadataSchema } from "../shared";
import { InvoiceWebhookCustomerDetailsSchema } from "../webhook";
import { InvoiceWebhookPaymentTypeFieldsSchema } from "./payment-type";

export const InvoiceWebhookSchema = z
	.object({
		status_code: z.string(),
		order_id: z.string(),
		transaction_id: z.string(),
		transaction_time: z.string(),
		transaction_status: TransactionStatusSchema,
		fraud_status: TransactionFraudStatusSchema,
		payment_type: PaymentTypeSchema,
		gross_amount: z.coerce.number(),
		customer_details: InvoiceWebhookCustomerDetailsSchema,
		expiry_time: z.string(),
		metadata: InvoiceMetadataSchema,
		currency: z.string(),
		signature_key: z.string(),
	})
	.and(InvoiceWebhookPaymentTypeFieldsSchema);

export type InvoiceWebhook = z.infer<typeof InvoiceWebhookSchema>;
