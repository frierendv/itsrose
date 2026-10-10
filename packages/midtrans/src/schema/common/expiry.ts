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
export const CustomExpiry = z
	.object({
		order_time: z
			.string()
			.optional()
			.describe("Timestamp in format YYYY-MM-DD HH:mm:ss Z"),
		expiry_duration: z
			.number()
			.int()
			.positive()
			.describe("Duration of expiry based on unit"),
		unit: ExpiryUnitSchema.extract([
			"second",
			"minute",
			"hour",
			"day",
		]).describe("Unit of time for duration"),
	})
	.meta({
		id: "MidtransCustomExpiry",
	});

export type CustomExpiry = z.infer<typeof CustomExpiry>;

/**
 * Expiry configuration for Snap and Payment Link requests.
 */
export const SnapExpiry = z
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
export type SnapExpiry = z.infer<typeof SnapExpiry>;

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
