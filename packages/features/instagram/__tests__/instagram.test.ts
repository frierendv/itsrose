import {
	decodeTokenizedUri,
	decodeUrlSafeBase64,
	extractEvalPayload,
	getQueryParam,
	isVideoUrl,
	safeDecodeURIComponent,
} from "../src/scraping/helpers";
import { MediaNodeSchema } from "../src/zod-schema/media";

describe("features/instagram", () => {
	describe("MediaNodeSchema", () => {
		it("validates media node payload", () => {
			const node = {
				url: "https://example.com/media.mp4",
				is_video: true,
			};
			const result = MediaNodeSchema.safeParse(node);
			expect(result.success).toBe(true);
		});
	});

	describe("Scraping Helpers", () => {
		it("decodes URL safe base64 strings", () => {
			const text = "Hello World";
			const encoded = Buffer.from(text).toString("base64url");
			expect(decodeUrlSafeBase64(encoded)).toBe(text);
		});

		it("extracts query parameters", () => {
			const url = "https://example.com/page?foo=bar&baz=123";
			expect(getQueryParam(url, "foo")).toBe("bar");
			expect(getQueryParam(url, "baz")).toBe("123");
			expect(getQueryParam(url, "missing")).toBeNull();
			expect(getQueryParam(undefined, "foo")).toBeNull();
		});

		it("safely decodes URI components", () => {
			expect(safeDecodeURIComponent("hello%20world")).toBe("hello world");
			expect(safeDecodeURIComponent("%E0%A4%A")).toBe("%E0%A4%A");
		});

		it("identifies video URLs", () => {
			expect(isVideoUrl("https://example.com/video.mp4")).toBe(true);
			expect(isVideoUrl("https://example.com/photo.jpg")).toBe(false);
		});

		it("extracts eval payload safely", () => {
			const script = "eval('console.log(123)')";
			const payload = extractEvalPayload(script);
			expect(payload).toBe("console.log(123)");
		});
	});
});
