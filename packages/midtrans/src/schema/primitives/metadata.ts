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

export const TimestampSchema = z.preprocess(
	(val) => {
		if (val && typeof val === "object" && "createdAt" in val) {
			const { createdAt, ...rest } = val;
			return { ...rest, created_at: createdAt };
		}
		return val;
	},
	z.object({
		created_at: z.string(),
		updated_at: z.string(),
	})
);
/**
 * Timestamp fields returned by the Midtrans dashboards and Payment Link API.
 */
export const TimestampFieldsSchema = z.object({
	created_at: z.string(),
	updated_at: z.string(),
	deleted_at: z.string(),
});

export type TimestampFields = z.infer<typeof TimestampFieldsSchema>;
