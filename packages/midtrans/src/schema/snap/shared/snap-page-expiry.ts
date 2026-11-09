import { z } from "zod/v4";
import { ExpirySchema } from "../../primitives";

export const SnapPageExpirySchema = ExpirySchema.omit({
	start_time: true,
});
export type SnapPageExpiry = z.infer<typeof SnapPageExpirySchema>;
