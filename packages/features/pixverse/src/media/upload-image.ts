import { neverRetry } from "@itsrose/upstream-client";
import { requestPixverse } from "../client/send";
import type { UploadImageResponse } from "../zod-schema";
import { UploadImageResponseSchema } from "../zod-schema";

/**
 * A file the caller wants uploaded.
 */
export interface PixverseUploadFile {
	/** The bytes of the file. */
	data: Blob | Uint8Array | ArrayBuffer;

	/** The file name sent in the multipart part. */
	filename: string;

	/** The MIME type sent in the multipart part. */
	content_type?: string;
}

/**
 * A source the caller uploads through the image endpoint.
 */
export interface UploadImageInput {
	/**
	 * The image itself.
	 */
	file: PixverseUploadFile;

	/**
	 * A label PixVerse keeps alongside the image.
	 */
	label_name?: string;
}

/**
 * Uploads an image so a generation request can refer to it by `img_id`.
 *
 * The upload is a distinct step from the generation that consumes it: an
 * accepted upload does not mean the image meets the requirements of a
 * particular operation, and the returned identifier is only valid for the
 * API account and region that uploaded it.
 *
 * @param input The image and its optional label.
 * @returns The image identifier and the URL it is served from.
 * @throws {UpstreamApiError} When PixVerse refused the upload - for example
 * with `500030` (too large) or `500032` (unsupported format).
 */
export async function uploadImage(
	input: UploadImageInput
): Promise<UploadImageResponse> {
	const form = new FormData();

	form.append("image", toBlob(input.file), input.file.filename);

	if (input.label_name !== undefined) {
		form.append("LabelName", input.label_name);
	}

	return requestPixverse({
		url: "/openapi/v2/image/upload",
		method: "POST",
		data: form,
		schema: UploadImageResponseSchema,
		label: "image upload response",
		// The call creates a resource upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});
}

/**
 * Normalizes the accepted file sources to a `Blob`.
 *
 * @param file The file to normalize.
 * @returns The file as a blob.
 */
function toBlob(file: PixverseUploadFile): Blob {
	if (file.data instanceof Blob) {
		return file.data;
	}

	const bytes =
		file.data instanceof ArrayBuffer
			? file.data
			: Uint8Array.from(file.data).buffer;

	return new Blob([bytes], {
		type: file.content_type ?? "application/octet-stream",
	});
}
