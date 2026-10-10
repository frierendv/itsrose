import { z } from "zod/v4";

/**
 * Item details
 */
export const PaymentItemFieldsSchema = z
	.object({
		/**
		 * Item unique identifier.
		 */
		id: z.string().min(1).max(40),
		/**
		 * Price of the item in `IDR`.
		 */
		price: z.int().positive(),
		/**
		 * Quantity of the item purchased by the customer.
		 */
		quantity: z.int().positive(),
		/**
		 * Name for this item.
		 */
		name: z.string().max(50),
		/**
		 * Item Brand.
		 */
		brand: z.string().max(50),
		/**
		 * Item Category.
		 */
		category: z.string().max(50),
		/**
		 * Merchant name that selling this item.
		 */
		merchant_name: z.string().max(100),
		/**
		 * HTTP URL of the item in the merchant site.
		 */
		url: z.url(),
	})
	.partial()
	.required({ price: true, quantity: true, name: true });

export type PaymentItemFields = z.infer<typeof PaymentItemFieldsSchema>;
