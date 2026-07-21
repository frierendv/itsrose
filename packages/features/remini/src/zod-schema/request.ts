import { SharedImageSchema } from "@itsrose/shared-schema";
import { z } from "zod/v4";
import {
	AutoBalanceFeatureSchema,
	BackgroundEnhanceFeatureSchema,
	BokehFeatureSchema,
	ColorEnhanceFeatureSchema,
	DodgeBurnFeatureSchema,
	FaceEnhanceFeatureSchema,
	FaceLiftingFeatureSchema,
} from "./pipeline-feature";

export const ReminiPipelineFeatureSchema = z.object({
	auto_balance: AutoBalanceFeatureSchema.meta({
		example: { auto_contrast: { contrast_intensity_coefficient: 1.5 } },
	}),
	background_enhance: BackgroundEnhanceFeatureSchema.meta({
		example: { model: "shiba-strong-tensorrt", remove_color_shift: true },
	}),
	bokeh: BokehFeatureSchema.meta({
		example: {
			aperture_radius: 0.3,
			apply_front_bokeh: false,
			group_picture: true,
			highlights: 0.25,
			rescale_kernel_for_small_images: true,
			vivid: 0.75,
		},
	}),
	color_enhance: ColorEnhanceFeatureSchema.meta({
		example: { model: "muted" },
	}),
	dodge_burn: DodgeBurnFeatureSchema.meta({
		example: { intensity: 0.5, model: "dodge_burn_residuals_big" },
	}),
	face_enhance: FaceEnhanceFeatureSchema.meta({
		example: { model: "remini", pre_blur: 0.6 },
	}),
	face_lifting: FaceLiftingFeatureSchema.meta({
		example: { model: "movie-style" },
	}),
});

export const ReminiRequestSchema = z.object({
	init_image: SharedImageSchema,
	pipelines: z
		.array(ReminiPipelineFeatureSchema.partial())
		.min(1)
		.max(5)
		.describe(
			"Ordered list of image processing pipelines to execute (min 1, max 5).\n\n" +
				"> [!warning] Unsuppoer mix of feature will cause an error"
		),
});

export type IReminiRequest = z.infer<typeof ReminiRequestSchema>;
export type IReminiPipelineFeature = z.infer<
	typeof ReminiPipelineFeatureSchema
>;
