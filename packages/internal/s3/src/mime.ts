/**
 * Common extension to MIME type lookup map.
 */
export const EXTENSION_TO_MIME: Readonly<Record<string, string>> = {
	// Audio
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	flac: "audio/flac",
	aac: "audio/aac",
	weba: "audio/webm",
	opus: "audio/opus",

	// Video
	mp4: "video/mp4",
	webm: "video/webm",
	mkv: "video/x-matroska",
	mov: "video/quicktime",
	avi: "video/x-msvideo",

	// Images
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	svg: "image/svg+xml",
	ico: "image/x-icon",
	avif: "image/avif",
	bmp: "image/bmp",
	tiff: "image/tiff",

	// Documents & Text
	json: "application/json",
	txt: "text/plain",
	csv: "text/csv",
	pdf: "application/pdf",
	xml: "application/xml",
	html: "text/html",
	htm: "text/html",
	css: "text/css",
	js: "text/javascript",
	mjs: "text/javascript",
	cjs: "text/javascript",
	ts: "text/typescript",
	md: "text/markdown",
	yaml: "application/yaml",
	yml: "application/yaml",

	// Archives
	zip: "application/zip",
	tar: "application/x-tar",
	gz: "application/gzip",
	"7z": "application/x-7z-compressed",

	// Binary default
	bin: "application/octet-stream",
};

/**
 * Extracts the file extension (without dot, in lowercase) from a file name or path.
 *
 * @param fileNameOrPath - The file name or path to inspect.
 * @returns The lowercase extension, or `undefined` if none found.
 */
export function getExtension(fileNameOrPath: string): string | undefined {
	const clean = fileNameOrPath.split("?")[0]?.split("#")[0] ?? "";
	const lastDot = clean.lastIndexOf(".");
	if (lastDot === -1 || lastDot === clean.length - 1) {
		return undefined;
	}
	return clean.slice(lastDot + 1).toLowerCase();
}

/**
 * Looks up the MIME type for a given file name, path, or extension.
 *
 * @param fileNameOrExt - The file name, path, or extension (with or without leading dot).
 * @returns The MIME type string, or `undefined` if not recognized.
 */
export function lookupMimeType(fileNameOrExt: string): string | undefined {
	const ext =
		getExtension(fileNameOrExt) ??
		fileNameOrExt.toLowerCase().replace(/^\./, "");
	return EXTENSION_TO_MIME[ext];
}

/**
 * Looks up a common file extension for a given MIME type.
 *
 * @param mimeType - The MIME type to search for.
 * @returns The primary file extension, or `undefined` if not found.
 */
export function lookupExtension(mimeType: string): string | undefined {
	const cleanMime = mimeType.toLowerCase().split(";")[0]?.trim();
	if (!cleanMime) {
		return undefined;
	}
	for (const [ext, mime] of Object.entries(EXTENSION_TO_MIME)) {
		if (mime === cleanMime) {
			return ext;
		}
	}
	return undefined;
}
