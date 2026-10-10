export interface FileTypeResult {
	ext: string;
	mime: string;
}

export async function fileTypeFromBuffer(
	buffer: Uint8Array | ArrayBuffer
): Promise<FileTypeResult | undefined> {
	const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	if (
		u8.length >= 4 &&
		u8[0] === 0x89 &&
		u8[1] === 0x50 &&
		u8[2] === 0x4e &&
		u8[3] === 0x47
	) {
		return { ext: "png", mime: "image/png" };
	}
	if (u8.length >= 3 && u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) {
		return { ext: "jpg", mime: "image/jpeg" };
	}
	if (u8.length >= 3 && u8[0] === 0x47 && u8[1] === 0x49 && u8[2] === 0x46) {
		return { ext: "gif", mime: "image/gif" };
	}
	if (u8.length >= 3 && u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
		return { ext: "mp3", mime: "audio/mpeg" };
	}
	return undefined;
}
