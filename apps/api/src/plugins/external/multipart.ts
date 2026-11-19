import fastifyMultipart from "@fastify/multipart";
import type { FastifyRequest } from "fastify";

/**
 * The part headers `attachFieldsToBody: "keyValues"` drops.
 *
 * The flattened body keeps a file part's bytes only; the filename and the
 * content type are needed by handlers that store the bytes (the durable asset
 * upload), so the parser records them per field name on the request.
 */
export type UploadedFilePart = {
	filename: string;
	mimetype: string;
};

/**
 * The minimum a file part exposes to the `onFile` hook.
 *
 * Declared structurally so the plugin never depends on the package's
 * CommonJS-flavoured type namespace.
 */
type MultipartFilePart = UploadedFilePart & {
	fieldname: string;
	toBuffer: () => Promise<Buffer>;
};

export const autoConfig = {
	limits: {
		fileSize: 50 * 1024 * 1024,
	},
	attachFieldsToBody: "keyValues",
	// attachFieldsToBody: true,
	/**
	 * Buffers the part (which `keyValues` needs) and keeps the headers the
	 * flattened body cannot carry.
	 */
	async onFile(this: FastifyRequest, part: MultipartFilePart): Promise<void> {
		const files = (this.uploadedFileParts ??= {});
		files[part.fieldname] = {
			filename: part.filename,
			mimetype: part.mimetype,
		};
		await part.toBuffer();
	},
};

declare module "fastify" {
	interface FastifyRequest {
		/** Headers of the file parts in a `keyValues` multipart body. */
		uploadedFileParts?: Record<string, UploadedFilePart>;
	}
}

/**
 * This plugins allows to parse the multipart content-type
 *
 * @see {@link https://github.com/fastify/fastify-multipart}
 */
export default fastifyMultipart;
