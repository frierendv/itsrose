/**
 * Detects the MIME type of a Buffer by inspecting its magic bytes.
 *
 * `file-type` is loaded lazily so that importing this module (and therefore the
 * storage client) never pulls in the heavy ESM-only detection chain unless it is
 * actually needed.
 *
 * @param buffer - Payload to inspect.
 * @param fallback - MIME type returned when detection fails or the buffer is empty.
 *
 * @example
 * const mime = await detectMimeType(Buffer.from("\x89PNG\r\n\x1a\n...", "binary"));
 * // => "image/png"
 */
export async function detectMimeType(
	buffer: Buffer,
	fallback = "application/octet-stream"
): Promise<string> {
	if (buffer.length === 0) {
		return fallback;
	}

	const { fileTypeFromBuffer } = await import("file-type");
	const result = await fileTypeFromBuffer(buffer);

	if (result && result.mime) {
		return result.mime;
	}

	return fallback;
}
