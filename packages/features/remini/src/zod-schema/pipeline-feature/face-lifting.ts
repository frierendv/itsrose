import { z } from "zod/v4";

export const FaceLiftingFeatureSchema = z.object({
	model: z
		.enum(["movie-style", "marzipan-style", "pinko_bigger_dataset-style"])
		.describe("Identifier of the face lifting model to be applied."),
});
