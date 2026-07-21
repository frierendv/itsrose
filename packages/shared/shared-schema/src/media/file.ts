import { z } from "zod/v4";

/**
 * File schema for a binary buffer, used for file uploads in multipart/form-data requests.
 */
export const SharedFileBufferSchema = z.instanceof(Buffer).meta({
	description: "File as a binary buffer. Only used for multipart/form-data.",
	type: "string",
	contentEncoding: "binary",
	format: "binary",
	id: "FileBuffer",
});

export type SharedFileBuffer = z.infer<typeof SharedFileBufferSchema>;
