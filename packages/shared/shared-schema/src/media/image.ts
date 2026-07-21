import { z } from "zod/v4";

const UrlSchema = z
	.url()
	.transform((val) => ({ type: "url" as const, value: val }))
	.meta({ title: "url" });
const Base64Schema = z
	.base64()
	.transform((val) => ({ type: "jpg" as const, value: val }))
	.meta({ title: "base64" });
/**
 * Will transform the image into an object with a type and value,
 * where type is either "url" or "jpg" and value is the corresponding string.
 *
 * @example
 *
 * const imageUrl = "https://example.com/image.jpg";
 * const imageBase64 = "data:image/jpeg;base64,/9j/...";
 *
 * const urlImage = SharedImageSchema.parse(imageUrl);
 * // urlImage will be { type: "url", value: "..." }
 *
 * const base64Image = SharedImageSchema.parse(imageBase64);
 * // base64Image will be { type: "jpg", value: "..." }
 */
export const SharedImageSchema = z
	.union([UrlSchema, Base64Schema])
	.describe(
		"The URL or base64 string of the image to be used as the initial image."
	)
	.meta({
		id: "SharedImageSchema",
		example:
			"https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg",
	});

export type SharedImage = z.infer<typeof SharedImageSchema>;
