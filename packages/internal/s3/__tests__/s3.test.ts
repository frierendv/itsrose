import {
	getExtension,
	lookupExtension,
	lookupMimeType,
	PUBLIC_KEY,
	S3,
	S3ValidationError,
	TEMP_KEY,
} from "../src";

describe("internal/s3", () => {
	const createTestClient = (
		options: Partial<ConstructorParameters<typeof S3>[0]> = {}
	) => {
		return new S3({
			accessKeyId: "test-access-key",
			secretAccessKey: "test-secret-key",
			endpoint: "https://test-bucket.s3.us-east-1.amazonaws.com",
			...options,
		});
	};

	describe("initialization and options", () => {
		it("initializes with default prefix and AWS endpoint", () => {
			const s3 = createTestClient();
			expect(s3.defaultPrefix).toBe(TEMP_KEY);
			expect(s3.publicDomain).toBeUndefined();
			expect(s3.bucketName).toBe("test-bucket");
		});

		it("normalizes custom publicDomain and strips protocol and trailing slashes", () => {
			const s3 = createTestClient({
				publicDomain: "https://example.com/media///",
			});
			expect(s3.publicDomain).toBe("example.com/media");
		});

		it("handles custom defaultPrefix", () => {
			const s3 = createTestClient({
				defaultPrefix: "uploads",
			});
			expect(s3.defaultPrefix).toBe("uploads");
		});
	});

	describe("createKey", () => {
		const s3 = createTestClient();

		it("creates key with default public path", () => {
			const key = s3.createKey("sample.png");
			expect(key).toBe(`${TEMP_KEY}/${PUBLIC_KEY}/sample.png`);
		});

		it("creates key with custom path", () => {
			const key = s3.createKey("audio.mp3", "music");
			expect(key).toBe(`${TEMP_KEY}/music/audio.mp3`);
		});

		it("defaults null or undefined path to PUBLIC_KEY without producing 'null'", () => {
			const keyNull = s3.createKey("audio.mp3", null);
			expect(keyNull).toBe(`${TEMP_KEY}/${PUBLIC_KEY}/audio.mp3`);

			const keyUndef = s3.createKey("audio.mp3", undefined);
			expect(keyUndef).toBe(`${TEMP_KEY}/${PUBLIC_KEY}/audio.mp3`);

			const keyEmpty = s3.createKey("audio.mp3", "");
			expect(keyEmpty).toBe(`${TEMP_KEY}/${PUBLIC_KEY}/audio.mp3`);
		});

		it("normalizes leading, trailing, and duplicate slashes", () => {
			const key = s3.createKey("/video.mp4/", "//user/123//");
			expect(key).toBe(`${TEMP_KEY}/user/123/video.mp4`);
		});

		it("supports custom prefix in options", () => {
			const key = s3.createKey("file.pdf", "docs", {
				prefix: "permanent",
			});
			expect(key).toBe("permanent/docs/file.pdf");
		});

		it("omits prefix when prefix is null or empty string", () => {
			const keyNullPrefix = s3.createKey("file.pdf", "docs", {
				prefix: null,
			});
			expect(keyNullPrefix).toBe("docs/file.pdf");

			const keyEmptyPrefix = s3.createKey("file.pdf", "docs", {
				prefix: "",
			});
			expect(keyEmptyPrefix).toBe("docs/file.pdf");
		});

		it("sanitizes path traversal attempts by default", () => {
			const key = s3.createKey("../../secret.txt", "../users/");
			expect(key).toBe(`${TEMP_KEY}/users/secret.txt`);
		});
	});

	describe("MIME and extension utilities", () => {
		it("extracts extension correctly", () => {
			expect(getExtension("file.png")).toBe("png");
			expect(getExtension("archive.tar.gz")).toBe("gz");
			expect(getExtension("path/to/image.WEBP?query=1")).toBe("webp");
			expect(getExtension("no_extension")).toBeUndefined();
		});

		it("looks up MIME type by extension or filename", () => {
			expect(lookupMimeType("mp3")).toBe("audio/mpeg");
			expect(lookupMimeType(".json")).toBe("application/json");
			expect(lookupMimeType("song.wav")).toBe("audio/wav");
			expect(lookupMimeType("photo.JPG")).toBe("image/jpeg");
			expect(lookupMimeType("unknown.xyz123")).toBeUndefined();
		});

		it("looks up extension by MIME type", () => {
			expect(lookupExtension("audio/mpeg")).toBe("mp3");
			expect(lookupExtension("image/png")).toBe("png");
			expect(lookupExtension("application/json; charset=utf-8")).toBe(
				"json"
			);
			expect(lookupExtension("unknown/type")).toBeUndefined();
		});

		it("exposes static lookup methods on S3 class", () => {
			expect(S3.lookupMimeType("song.mp3")).toBe("audio/mpeg");
			expect(S3.lookupExtension("audio/mpeg")).toBe("mp3");
		});
	});

	describe("getFileType", () => {
		const s3 = createTestClient();

		it("detects PNG from magic bytes in Buffer", async () => {
			const pngHeader = Buffer.from(
				"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
				"hex"
			);
			const ft = await s3.getFileType(pngHeader);
			expect(ft).toEqual({ ext: "png", mime: "image/png" });
		});

		it("detects file type from Uint8Array and ArrayBuffer", async () => {
			const pngHeader = Buffer.from(
				"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
				"hex"
			);
			const uint8 = new Uint8Array(pngHeader);
			const ftUint8 = await s3.getFileType(uint8);
			expect(ftUint8).toEqual({ ext: "png", mime: "image/png" });

			const arrayBuffer = pngHeader.buffer.slice(
				pngHeader.byteOffset,
				pngHeader.byteOffset + pngHeader.byteLength
			);
			const ftAb = await s3.getFileType(arrayBuffer);
			expect(ftAb).toEqual({ ext: "png", mime: "image/png" });
		});

		it("falls back to filename extension when magic bytes do not match", async () => {
			const textBuffer = Buffer.from('{"hello":"world"}');
			const ft = await s3.getFileType(textBuffer, "data.json");
			expect(ft).toEqual({ ext: "json", mime: "application/json" });
		});

		it("falls back to bin / application/octet-stream when unrecognized", async () => {
			const randomBuffer = Buffer.from([0x01, 0x02, 0x03]);
			const ft = await s3.getFileType(randomBuffer);
			expect(ft).toEqual({
				ext: "bin",
				mime: "application/octet-stream",
			});
		});
	});

	describe("getObjectPublicUrl", () => {
		it("uses custom publicDomain when provided", () => {
			const s3 = createTestClient({
				publicDomain: "pub-12345.r2.dev",
			});
			const url = s3.getObjectPublicUrl("t/public/sample.mp3");
			expect(url).toBe("https://pub-12345.r2.dev/t/public/sample.mp3");
		});

		it("preserves subpaths in publicDomain without losing them", () => {
			const s3 = createTestClient({
				publicDomain: "https://example.com/media/",
			});
			const url = s3.getObjectPublicUrl("/t/public/song.mp3");
			expect(url).toBe("https://example.com/media/t/public/song.mp3");
		});

		it("supports http protocol for local dev in publicDomain", () => {
			const s3 = createTestClient({
				publicDomain: "http://localhost:9000/my-bucket",
			});
			const url = s3.getObjectPublicUrl("files/doc.pdf");
			expect(url).toBe("http://localhost:9000/my-bucket/files/doc.pdf");
		});

		it("falls back to AWS S3 format when publicDomain is not set", () => {
			const s3 = createTestClient({
				region: "us-west-2",
			});
			const url = s3.getObjectPublicUrl("t/public/image.png");
			expect(url).toBe(
				"https://test-bucket.s3.us-west-2.amazonaws.com/t/public/image.png"
			);
		});

		it("omits region in AWS S3 URL if region is 'auto'", () => {
			const s3 = createTestClient({
				region: "auto",
			});
			const url = s3.getObjectPublicUrl("t/public/image.png");
			expect(url).toBe(
				"https://test-bucket.s3.amazonaws.com/t/public/image.png"
			);
		});

		it("throws S3ValidationError if key is empty", () => {
			const s3 = createTestClient();
			expect(() => s3.getObjectPublicUrl("   ///   ")).toThrow(
				S3ValidationError
			);
		});
	});

	describe("upload and uploadBase64 helpers", () => {
		it("calls putAnyObject with auto-inferred MIME type and returns publicUrl", async () => {
			const s3 = createTestClient({
				publicDomain: "example.com",
			});

			const putAnyObjectSpy = jest
				.spyOn(s3, "putAnyObject")
				.mockResolvedValueOnce({
					ok: true,
					status: 200,
					headers: new Map(),
				});

			const pngHeader = Buffer.from(
				"89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489",
				"hex"
			);

			const result = await s3.upload("t/public/logo.png", pngHeader);

			expect(putAnyObjectSpy).toHaveBeenCalledWith(
				"t/public/logo.png",
				pngHeader,
				undefined,
				undefined,
				undefined,
				undefined
			);
			expect(result.key).toBe("t/public/logo.png");
			expect(result.publicUrl).toBe(
				"https://example.com/t/public/logo.png"
			);
		});
	});

	describe("exists helper", () => {
		it("returns true when objectExists resolves to true", async () => {
			const s3 = createTestClient();
			jest.spyOn(s3, "objectExists").mockResolvedValueOnce(true);

			const exists = await s3.exists("test.txt");
			expect(exists).toBe(true);
		});

		it("returns false when objectExists resolves to false or null", async () => {
			const s3 = createTestClient();
			jest.spyOn(s3, "objectExists").mockResolvedValueOnce(false);

			const exists = await s3.exists("test.txt");
			expect(exists).toBe(false);

			jest.spyOn(s3, "objectExists").mockResolvedValueOnce(null);
			const existsNull = await s3.exists("test.txt");
			expect(existsNull).toBe(false);
		});
	});
});
