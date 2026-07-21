import { z } from "zod/v4";
import { SharedRequestSchema } from "../shared";

export const ImageRestorationRequestSchema = z
	.object({
		ir_mode: z
			.enum(["wink-ultra-hd", "xiuxiu-ultra-hd"])
			.optional()
			.transform((value) => (value === "xiuxiu-ultra-hd" ? 4 : 3))
			.describe("Effect mode"),
		save_photo_format: z
			.enum(["jpg", "png"])
			.optional()
			.describe("Output image format"),
		use_denoise: z
			.boolean()
			.optional()
			.transform((value) => (value ? 1 : 0))
			.describe("Background repair flag."),
		use_hd_face_opt: z
			.boolean()
			.optional()
			.transform((value) => (value ? 1 : 0))
			.describe("Portrait Repair Upgrade flag."),
	})
	.and(SharedRequestSchema)
	.meta({
		title: "Image Restoration Request Schema",
	});

export interface IImageRestorationRequest extends z.infer<
	typeof ImageRestorationRequestSchema
> {}
