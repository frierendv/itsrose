import { z } from "zod/v4";

export const ExpiryUnitSchema = z
	.enum(["second", "minute", "hour", "day", "days", "hours", "minutes"])
	.meta({
		id: "MidtransExpiryUnit",
	});

export type ExpiryUnit = z.infer<typeof ExpiryUnitSchema>;

/**
 * Custom expiry configuration for Core API charge requests.
 */
export const CustomExpirySchema = z
	.object({
		/**
		 * Timestamp in format `YYYY-MM-DD HH:mm:ss Z`.
		 */
		order_time: z.string().optional(),
		/**
		 * Duration of expiry based on unit.
		 */
		expiry_duration: z.number().int().positive(),
		/**
		 * Unit of time for duration.
		 */
		unit: ExpiryUnitSchema.extract(["second", "minute", "hour", "day"]),
	})
	.meta({
		id: "MidtransCustomExpiry",
	});

export type CustomExpiry = z.infer<typeof CustomExpirySchema>;

/**
 * Expiry configuration for Snap and Payment Link requests.
 */
export const ExpirySchema = z
	.object({
		/**
		 * Payment expiry start time.
		 */
		start_time: z.string().optional(),
		/**
		 * Payment expiry duration.
		 */
		duration: z.int(),
		/**
		 * Time unit of payment expiry duration.
		 */
		unit: ExpiryUnitSchema,
	})
	.meta({
		id: "MidtransSnapExpiry",
	});

export type Expiry = z.infer<typeof ExpirySchema>;
