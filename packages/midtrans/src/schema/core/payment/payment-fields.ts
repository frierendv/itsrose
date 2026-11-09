import { z } from "zod/v4";
import {
	CustomerDetailsSchema,
	CustomExpirySchema,
	CustomFieldsSchema,
	MetadataSchema,
	TransactionDetailsSchema,
} from "../../primitives";
import { PaymentItemFieldsSchema } from "./payment-item-fields";
import { PaymentTypeFieldsSchema } from "./payment-type-fields";

export const PaymentFieldsSchema = z
	.object({
		/**
		 * Transaction details.
		 */
		transaction_details: TransactionDetailsSchema,
		/**
		 * Representing a purchased product or fee/discount line.
		 */
		item_details: z.array(PaymentItemFieldsSchema).optional(),
		/**
		 * Customer details.
		 */
		customer_details: CustomerDetailsSchema.optional(),
		/**
		 * Set an expiry time for the payment of every transaction with `transaction_status:pending`
		 *
		 * The transaction is rejected if the custom expiry exceeds the allowed maximum time.
		 */
		custom_expiry: CustomExpirySchema.optional(),
		/**
		 * A free-form JSON object.
		 *
		 * You can use this metadata as a transaction tag and
		 * retrieve it using Get Status or HTTP Notifications URL.
		 */
		metadata: MetadataSchema.optional(),
	})
	.and(PaymentTypeFieldsSchema)
	.and(CustomFieldsSchema);

export type PaymentFields = z.infer<typeof PaymentFieldsSchema>;
