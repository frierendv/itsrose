import { z } from "zod/v4";
import { BCAExclusiveFreeTextSchema } from "../core";
import {
	CallbacksSchema,
	CstoreStoreSchema,
	CustomerDetailsSchema,
	CustomFieldsSchema,
	ExpirySchema,
	ItemDetailsSchema,
	PaymentChannels,
	TransactionDetailsSchema,
} from "../primitives";
import { SnapRecurringSchema, SnapSendEmailSchema } from "./shared";

const SnapVaSchema = z.object({
	va_number: z.string().max(30).optional(),
});

export const SnapTransactionRequestSchema = z
	.object({
		transaction_details: TransactionDetailsSchema,
		item_details: z
			.array(ItemDetailsSchema.omit({ item_id: true }))
			.optional(),
		customer_details: CustomerDetailsSchema.omit({ id: true })
			.partial()
			.optional(),
		enabled_payments: z.array(PaymentChannels).optional(),
		credit_card: z
			.object({
				secure: z.boolean().optional(),
				bank: z.string().optional(),
				save_card: z.boolean().optional(),
				installment: z
					.object({
						required: z.boolean().optional(),
						terms: z.array(z.number()).optional(),
					})
					.optional(),
				whitelist_bins: z.array(z.string()).optional(),
			})
			.optional(),
		bca_va: SnapVaSchema.extend({
			sub_company_code: z.string().max(10).optional(),
			free_text: BCAExclusiveFreeTextSchema.optional(),
		}).optional(),
		bni_va: SnapVaSchema.optional(),
		bri_va: SnapVaSchema.optional(),
		cimb_va: SnapVaSchema.optional(),
		permata_va: SnapVaSchema.extend({
			recipient_name: z.string().max(50).optional(),
		}).optional(),
		gopay: z
			.object({
				enable_callback: z.boolean().optional(),
				callback_url: z.url().optional(),
			})
			.optional(),
		shopeepay: z
			.object({
				callback_url: z.url().optional(),
			})
			.optional(),
		cstore: z
			.object({
				store: CstoreStoreSchema,
				message: z.string().max(50).optional(),
			})
			.optional(),
		expiry: ExpirySchema.optional(),
		callbacks: CallbacksSchema.optional(),
		recurring: SnapRecurringSchema.optional(),
		send_email: SnapSendEmailSchema.optional(),
	})
	.extend(CustomFieldsSchema.shape);

export type SnapTransactionRequest = z.infer<
	typeof SnapTransactionRequestSchema
>;
