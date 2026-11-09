import { z } from "zod/v4";

/**
 * Arbitrary JSON metadata sent to and stored with the transaction.
 */
export const MetadataSchema = z
	.record(z.string(), z.unknown())
	.meta({ id: "MidtransMetadata" });

export type Metadata<T = unknown> = T extends object
	? T
	: z.infer<typeof MetadataSchema>;

/**
 * Timestamp fields returned by the Midtrans dashboards and Payment Link API.
 */
export const TimestampFieldsSchema = z.object({
	createdAt: z.string(),
	updatedAt: z.string(),
	deletedAt: z.string(),
});

export type TimestampFields = z.infer<typeof TimestampFieldsSchema>;
