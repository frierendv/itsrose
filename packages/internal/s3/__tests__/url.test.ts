import {
	getObjectPublicUrl,
	normalizeStorageKey,
	S3ValidationError,
} from "../src";

describe("packages/internal/s3/url", () => {
	describe("Cloudflare R2 Public URL Resolution", () => {
		it("resolves exact path with custom domain without bucket prefix", () => {
			const url = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				customDomain: "https://pub-cdn.itsrose.net",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("resolves path-style with bucket prefix when no custom domain is provided", () => {
			const url = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				bucket: "bucket-name",
				endpoint: "https://endpoint.com",
			});
			expect(url).toBe(
				"https://endpoint.com/bucket-name/t/artifacts/export.csv"
			);
		});

		it("strips accidental bucket name prefix from key when custom domain is used", () => {
			const url = getObjectPublicUrl({
				key: "bucket-name/t/artifacts/export.csv",
				bucket: "bucket-name",
				customDomain: "https://pub-cdn.itsrose.net",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("prevents double bucket prefix in path-style URLs", () => {
			const url = getObjectPublicUrl({
				key: "bucket-name/t/artifacts/export.csv",
				bucket: "bucket-name",
				endpoint: "https://endpoint.com",
			});
			expect(url).toBe(
				"https://endpoint.com/bucket-name/t/artifacts/export.csv"
			);
		});

		it("normalizes custom domain without protocol to https", () => {
			const url = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				customDomain: "pub-cdn.itsrose.net",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("handles custom domain with path prefix correctly", () => {
			const url = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				customDomain: "https://pub-cdn.itsrose.net/cdn",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/cdn/t/artifacts/export.csv"
			);
		});

		it("normalizes leading, trailing, and redundant slashes in keys", () => {
			const url = getObjectPublicUrl({
				key: "///t//artifacts///export.csv///",
				customDomain: "https://pub-cdn.itsrose.net",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("supports publicDomain and publicCdnUrl aliases", () => {
			const url1 = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				publicDomain: "https://pub-cdn.itsrose.net",
			});
			expect(url1).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);

			const url2 = getObjectPublicUrl({
				key: "t/artifacts/export.csv",
				publicCdnUrl: "https://pub-cdn.itsrose.net",
			});
			expect(url2).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("supports positional key argument overload", () => {
			const url = getObjectPublicUrl("t/artifacts/export.csv", {
				customDomain: "https://pub-cdn.itsrose.net",
			});
			expect(url).toBe(
				"https://pub-cdn.itsrose.net/t/artifacts/export.csv"
			);
		});

		it("throws S3ValidationError on empty or whitespace keys", () => {
			expect(() => getObjectPublicUrl({ key: "" })).toThrow(
				S3ValidationError
			);
			expect(() => getObjectPublicUrl({ key: "   ///   " })).toThrow(
				S3ValidationError
			);
		});
	});

	describe("normalizeStorageKey", () => {
		it("cleans paths, strips directory traversal and collapses slashes", () => {
			expect(normalizeStorageKey("path/to/../file.txt")).toBe(
				"path/file.txt"
			);
			expect(normalizeStorageKey("//t//user/123/doc.pdf//")).toBe(
				"t/user/123/doc.pdf"
			);
			expect(normalizeStorageKey("C:\\windows\\style\\path.txt")).toBe(
				"C:/windows/style/path.txt"
			);
		});

		it("strips bucket prefix when key starts with bucket name", () => {
			expect(
				normalizeStorageKey(
					"my-bucket/t/artifacts/export.csv",
					"my-bucket"
				)
			).toBe("t/artifacts/export.csv");
		});
	});
});
