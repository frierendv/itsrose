import { z } from "zod/v4";
import { SharedResponseSchema } from "../shared";

const LabelEnumSchema = z
	.enum([
		"background",
		"headpiece",
		"hair",
		"gloves",
		"glasses",
		"top",
		"dress",
		"coat",
		"socks",
		"pants",
		"skin",
		"scarf etc.",
		"skirt",
		"face",
		"shoes",
		"bag",
		"accessories",
		"jumpsuit",
		"mannequin_stand",
	])
	.describe("Possible labels for segmented clothing items");

const LabelSchema = z.object({
	label: LabelEnumSchema,
	n_label: z
		.string()
		.describe("Numeric label for the segmented clothing item"),
	url: z.url().describe("URL of the segmented clothing item"),
});

export const ClothesSegmentationResponseSchema = SharedResponseSchema.extend({
	segmentation_mask: z
		.array(z.url())
		.describe("Array of segmentation mask URLs"),
	labels: z.array(LabelSchema).describe("Array of segmented clothing items"),
}).omit({ task_id: true, status: true, media_list: true });

export type IClothesSegmentationResponse = z.infer<
	typeof ClothesSegmentationResponseSchema
>;
