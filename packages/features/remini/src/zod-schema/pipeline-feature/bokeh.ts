import { z } from "zod/v4";

export const BokehFeatureSchema = z.object({
	aperture_radius: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"A normalized aperture radius for the bokeh effect. Value must be between 0 and 1."
		),
	apply_front_bokeh: z
		.boolean()
		.describe(
			"Flag indicating whether the bokeh effect should be applied to foreground elements."
		),
	group_picture: z
		.boolean()
		.describe(
			"Flag indicating if the image contains multiple subjects (group photo), which may alter face-related processing."
		),
	highlights: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"Normalized intensity of highlights in the bokeh effect (0 to 1)."
		),
	rescale_kernel_for_small_images: z
		.boolean()
		.describe(
			"When true, rescales the blur kernel for small images to preserve bokeh quality."
		),
	vivid: z
		.number()
		.min(0)
		.max(1)
		.describe(
			"Normalized vividness parameter for the bokeh effect (0 to 1)."
		),
});
