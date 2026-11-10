import { z } from "zod/v4";

/**
 * Midtrans item detail object representing a purchased product or fee/discount line.
 */
export const ItemDetailsSchema = z
	.object({
		/** Used in core/snap API for item identifier */
		id: z.string().max(50).optional(),
		/** Used in invoice api for item identifier */
		item_id: z.string().max(50).optional(),
		/** Price per item in IDR. */
		price: z.int(),
		/** Quantity of items (must be at least 1). */
		quantity: z.int().min(1),
		/** Item name or description. */
		name: z.string().max(50),
		/** Brand of the item. */
		brand: z.string().max(50).optional(),
		/** Category of the item. */
		category: z.string().max(50).optional(),
		/**
		 * Merchant selling the item.
		 * Useful if have multiple sub-merchants within commerce platform.
		 */
		merchant_name: z.string().max(50).optional(),
		/** Http url link for this item */
		url: z.url().max(50).optional(),
	})
	.meta({
		id: "MidtransItemDetails",
	});

export type ItemDetails = z.infer<typeof ItemDetailsSchema>;

/**
 * BCA KlikPay exclusive field.
 */
export const ItemDetailsBCAKlikPayExclusiveSchema = z
	.object({
		/**
		 * Installment term, use two digits numeric.
		 * For example, `03`, `06`, `09`, `12`, `24`.
		 */
		tenor: z.number().max(2),
		/**
		 * Installment code. Use `000` for default.
		 */
		code_plan: z.number().max(3),
		/** Installment Merchant ID. */
		mid: z.number().max(9),
	})
	.meta({
		id: "MidtransItemDetailsBCAKlikPayExclusive",
	});
export type ItemDetailsBCAKlikPayExclusive = z.infer<
	typeof ItemDetailsBCAKlikPayExclusiveSchema
>;

/**
 * @deprecated Misspelled alias; use {@link ItemDetailsBCAKlikPayExclusiveSchema}.
 */
export const ItemDetailsBCAKlickPayExclusive =
	ItemDetailsBCAKlikPayExclusiveSchema;
export type ItemDetailsBCAKlickPayExclusive = ItemDetailsBCAKlikPayExclusive;
