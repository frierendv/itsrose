import { z } from "zod/v4";

/**
 * Mandiri Bill Payment parameters.
 */
export const MandiriEchannelFieldsSchema = z
	.object({
		/**
		 * Label 1.
		 *
		 * @example
		 * "Payment For:"
		 */
		bill_info1: z.string().max(10),
		/**
		 * Label 2.
		 *
		 * @example
		 * "Surya exclusive"
		 */
		bill_info2: z.string().max(30),
		/**
		 * Label 3.
		 *
		 * @example
		 * "Name:"
		 */
		bill_info3: z.string().max(10),
		/**
		 * Label 4.
		 *
		 * @example
		 * "Jhon doe"
		 */
		bill_info4: z.string().max(30),
		/**
		 * Label 5.
		 *
		 * @example
		 * "Variant:"
		 */
		bill_info5: z.string().max(10),
		/**
		 * Label 6.
		 * @example
		 * "16/batang"
		 */
		bill_info6: z.string().max(30),
		/**
		 * Label 7.
		 *
		 * @example
		 * "Code:"
		 */
		bill_info7: z.string().max(10),
		/**
		 * Label 8.
		 * @example
		 * "123"
		 */
		bill_info8: z.string().max(30),
		/**
		 * Custom bill key identifier assigned by the merchant (6–12 digits).
		 *
		 * @remarks
		 * **Length & Padding Handling:**
		 * - Values shorter than 6 digits are left-padded by Midtrans with trailing zeros
		 *   at the most significant bit positions.
		 * - Values exceeding 12 digits are truncated at the least significant bits.
		 *
		 * **Uniqueness & Active Key Behavior:**
		 * If a prior transaction using the same `bill_key` is still active, Midtrans generates
		 * and assigns a randomized bill key instead.
		 *
		 * - **B2C:** Accepts 6–12 digits. Considered active while the transaction status is `PENDING`.
		 * - **B2B:** Accepts 6–12 digits. Remains active indefinitely until paid or explicitly cancelled.
		 *
		 * @see {@link https://docs.midtrans.com/reference/cancel-transaction | Midtrans Transaction Cancellation}
		 */
		bill_key: z.string().min(6).max(12),
	})
	.partial()
	.required({ bill_info1: true, bill_info2: true });

export type MandiriEchannelFields = z.infer<typeof MandiriEchannelFieldsSchema>;
