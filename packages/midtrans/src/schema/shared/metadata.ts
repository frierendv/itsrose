import { z } from "zod/v4";

export const MetadataSchema = z.record(z.string(), z.any());

export type Metadata<T = unknown> = T extends object
	? T
	: z.infer<typeof MetadataSchema>;
