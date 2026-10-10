import { z } from "zod/v4";
import {
	CallbacksSchema,
	CustomerDetailsSchema,
	CustomFieldsSchema,
	ExpirySchema,
	ItemDetailsSchema,
	PaymentChannelSchema,
	TransactionDetailsSchema,
} from "../shared";
import { SnapSendEmailSchema } from "./shared";
import { SnapRecurringSchema } from "./shared/snap-recurring";

export const SnapTransactionRequestSchema = z
	.object({
		transaction_details: TransactionDetailsSchema,
		item_details: ItemDetailsSchema.omit({ item_id: true }).optional(),
		customer_details: CustomerDetailsSchema.omit({ id: true })
			.partial()
			.optional(),
		enabled_payments: z.array(PaymentChannelSchema).optional(),
		expiry: ExpirySchema.optional(),
		callbacks: CallbacksSchema.omit({ unfinish: true }).optional(),
		recurring: SnapRecurringSchema.optional(),
		send_email: SnapSendEmailSchema.optional(),
	})
	.extend(CustomFieldsSchema.shape);

export type SnapTransactionRequest = z.infer<
	typeof SnapTransactionRequestSchema
>;
