import { createHash } from "crypto";
import { imageSize } from "image-size";

export type ImageMetadata = {
	image_content_type: string;
	image_md5: string;
	image_size: number;
	image_resolution_width: number;
	image_resolution_height: number;
};

type IsOK = boolean;

/**
 * Extract image metadata similar like remini engine output
 * @param {Buffer} buffer
 * @returns {[IsOK, ImageMetadata]}
 */
export const extractImageMetadata = (buffer: Buffer): [IsOK, ImageMetadata] => {
	const iS = imageSize(buffer);
	const metadata = {
		/** ! hack: If the image-size don't know the image type fallback to "jpg" */
		image_content_type: "image/" + (iS.type ?? "jpg"),
		image_md5: createHash("md5").update(buffer).digest("base64"),
		image_size: buffer.length,
		image_resolution_width: iS.width,
		image_resolution_height: iS.height,
	};
	const isOk = !!iS.type || !!(iS?.height && iS?.width);
	return [isOk, metadata];
};
