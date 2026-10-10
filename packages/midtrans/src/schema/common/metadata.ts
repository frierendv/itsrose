import { z } from "zod/v4";

/**
 * Arbitrary JSON metadata sent to and stored with the transaction.
 */
export const Metadata = z.record(z.string(), z.unknown()).meta({
	id: "MidtransMetadata",
});

/**
 * Custom fields 1 to 3 used as additional transaction metadata tags.
 */
export const CustomFields = z
	.object({
		custom_field1: z.string().max(255).optional(),
		custom_field2: z.string().max(255).optional(),
		custom_field3: z.string().max(255).optional(),
	})
	.meta({
		id: "MidtransCustomFields",
	});

export const TimestampFields = z.object({
	createdAt: z.string(),
	updatedAt: z.string(),
	deletedAt: z.string(),
});
export type Metadata = z.infer<typeof Metadata>;
export type CustomFields = z.infer<typeof CustomFields>;
export type TimestampFields = z.infer<typeof TimestampFields>;
