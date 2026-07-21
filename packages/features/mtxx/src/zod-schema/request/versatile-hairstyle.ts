import { z } from "zod/v4";
import { SharedRequestSchema } from "../shared";

export const VersatileHairstyleRequestSchema = z
	.object({
		hair_type: z
			.string()
			.describe(
				"Specifies the target hairstyle to apply. " +
					"See Example rendered visual for more detail."
			),
	})
	.and(SharedRequestSchema)
	.meta({
		title: "Versatile Hairstyle Request",
	});

export interface IVersatileHairstyleRequest extends z.infer<
	typeof VersatileHairstyleRequestSchema
> {}
