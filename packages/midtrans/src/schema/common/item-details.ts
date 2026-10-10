import { z } from "zod/v4";

/**
 * Midtrans item detail object representing a purchased product or fee/discount line.
 */
export const ItemDetails = z
	.object({
		item_id: z.string().max(50).optional(),
		/**
		 * Price per item in IDR.
		 */
		price: z.int(),
		/**
		 * Quantity of items (must be at least 1).
		 */
		quantity: z.int().min(1),
		/**
		 * Item name or description.
		 */
		name: z.string().max(50),
		/** Brand of the item. */
		brand: z.string().max(50).optional(),
		/** Category of the item. */
		category: z.string().max(50).optional(),
		/**
		 * Merchant selling the item.
		 *
		 * Useful if have multiple sub-merchants within commerce platform.
		 */
		merchant_name: z.string().max(50).optional(),
	})
	.meta({
		id: "MidtransItemDetail",
	});

/**
 * BCA KlikPay exclusive field.
 */
export const ItemDetailsBCAKlickPayExclusive = z.object({
	/**
	 * Installment term, use two digits numeric.
	 *
	 * For example, `03`, `06`, `09`, `12`, `24`.
	 */
	tenor: z.number().max(2),
	/**
	 * Installment code
	 *
	 * Use `000` for default.
	 */
	code_plan: z.number().max(3),
	/**
	 * Installment Merchant ID.
	 */
	mid: z.number().max(9),
});
export type ItemDetailsBCAKlickPayExclusive = z.infer<
	typeof ItemDetailsBCAKlickPayExclusive
>;

/** Properly spelled alias for {@linkcode ItemDetailsBCAKlickPayExclusive} */
export const ItemDetailsBCAKlikPayExclusive = ItemDetailsBCAKlickPayExclusive;
export type ItemDetailsBCAKlikPayExclusive = ItemDetailsBCAKlickPayExclusive;

export type ItemDetails = z.infer<typeof ItemDetails>;
