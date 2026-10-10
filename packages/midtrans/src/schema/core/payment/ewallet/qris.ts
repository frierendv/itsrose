import { z } from "zod/v4";

export const QrisAcquirerSchema = z.enum(["gopay", "airpay shopee"]);
export type QrisAcquirer = z.infer<typeof QrisAcquirerSchema>;

/**
 * QRIS charge parameters.
 */
export const QrisFieldsSchema = z.object({
	/**
	 * Acquiring partner for QRIS generation.
	 */
	acquirer: QrisAcquirerSchema.optional(),
});

export type QrisFields = z.infer<typeof QrisFieldsSchema>;
