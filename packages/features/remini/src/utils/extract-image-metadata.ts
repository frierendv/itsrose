import { createHash } from "node:crypto";
import { imageSize } from "image-size";

export type ImageMetadata = {
	image_content_type: string;
	image_md5: string;
	image_size: number;
	image_resolution_width: number;
	image_resolution_height: number;
};

type IsOK = boolean;

type ImageMetadataResult = [isOk: IsOK, metadata: ImageMetadata | null];

/**
 * Extract image metadata similar to the Remini engine output.
 *
 * @param buffer - Image data to inspect.
 * @returns A tuple containing the validation result and image metadata.
 */
export const extractImageMetadata = (buffer: Buffer): ImageMetadataResult => {
	if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
		return [false, null];
	}

	try {
		const { type, width, height } = imageSize(buffer);

		if (!width || !height) {
			return [false, null];
		}

		const metadata: ImageMetadata = {
			image_content_type: `image/${type ?? "jpg"}`,
			// MD5 is required for compatibility with the Remini API.
			image_md5: createHash("md5").update(buffer).digest("base64"),
			image_size: buffer.length,
			image_resolution_width: width,
			image_resolution_height: height,
		};

		return [true, metadata];
	} catch {
		return [false, null];
	}
};
