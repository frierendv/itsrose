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
			expect(isVideoUrl("https://example.com/photo.png")).toBe(false);

			// Non-mp4 URL without token parameter (lines 121-123)
			expect(isVideoUrl("https://example.com/stream_no_ext")).toBe(false);

			// Video URL identified via token payload containing .mp4
			const payload = Buffer.from("sub/file.mp4").toString("base64url");
			const tokenUrl = `https://example.com/media?token=header.${payload}`;
			expect(isVideoUrl(tokenUrl)).toBe(true);

			// Token with no payload after dot on non-mp4 URL (lines 126-127)
			expect(isVideoUrl("https://example.com/stream?token=header.")).toBe(
				false
			);

			// Invalid token fallback
			const badTokenUrl =
				"https://example.com/media?token=invalidpayload";
			expect(isVideoUrl(badTokenUrl)).toBe(false);

			// Token payload throwing error inside isVideoUrl catch block (lines 131-132)
			const toStringSpy = jest
				.spyOn(Buffer.prototype, "toString")
				.mockImplementationOnce(() => {
					throw new Error("Decode failed");
				});
			expect(
				isVideoUrl("https://example.com/stream?token=header.payload")
			).toBe(false);
			toStringSpy.mockRestore();
		});

		it("decodes tokenized URIs", () => {
			// Without token
			expect(decodeTokenizedUri("https://example.com/plain")).toBe(
				"https://example.com/plain"
			);

			// With valid token payload containing url property
			const jsonPayload = JSON.stringify({
				url: "https://example.com/target.mp4",
			});
			const encodedPayload =
				Buffer.from(jsonPayload).toString("base64url");
			const uriWithToken = `https://example.com/path?token=header.${encodedPayload}`;
			expect(decodeTokenizedUri(uriWithToken)).toBe(
				"https://example.com/target.mp4"
			);

			// Token payload without string url property (tests non-string url branch)
			const jsonNoUrl = JSON.stringify({ nonUrl: 123 });
			const encodedNoUrl = Buffer.from(jsonNoUrl).toString("base64url");
			const uriNoUrl = `https://example.com/path?token=header.${encodedNoUrl}`;
			expect(decodeTokenizedUri(uriNoUrl)).toBe(uriNoUrl);

			// Token without dot separator or invalid JSON payload returns original URI
			expect(
				decodeTokenizedUri("https://example.com/path?token=invalid")
			).toBe("https://example.com/path?token=invalid");
			expect(
				decodeTokenizedUri("https://example.com/path?token=header.")
			).toBe("https://example.com/path?token=header.");
			const badJsonPayload =
				Buffer.from("not-json").toString("base64url");
			expect(
				decodeTokenizedUri(
					`https://example.com/path?token=header.${badJsonPayload}`
				)
			).toBe(`https://example.com/path?token=header.${badJsonPayload}`);
		});

		it("extracts eval payload safely", () => {
			const script = "eval('console.log(123)')";
			const payload = extractEvalPayload(script);
			expect(payload).toBe("console.log(123)");

			// Script that doesn't call eval returns null (falsy capturedPayload branch)
			expect(extractEvalPayload("const x = 1;")).toBeNull();

			// Exercises sandbox document DOM methods and atob helper
			const domScript =
				"document.getElementById('a'); document.querySelector('b'); document.write('c'); atob('aGVsbG8='); eval('done');";
			expect(extractEvalPayload(domScript)).toBe("done");

			// Error handling returns null
			expect(extractEvalPayload("syntax error ++")).toBeNull();
		});
	});
});
