import { S3ValidationError } from "@itsrose/s3";
import {
	buildArtifactKey,
	buildArtifactPrefix,
	buildEphemeralKey,
	buildUserEphemeralKey,
	buildUserFileKey,
	buildUserPrefix,
	EPHEMERAL_ROOT,
	parseEphemeralKey,
	parseUserStorageKey,
	sanitizeCategory,
	sanitizeFilename,
	sanitizeJobId,
	sanitizeUserId,
} from "../keys";

describe("packages/auth/src/storage/keys", () => {
	describe("sanitizeUserId", () => {
		it("accepts valid alphanumeric, hyphen, and underscore user IDs", () => {
			expect(sanitizeUserId("user-123_abc")).toBe("user-123_abc");
			expect(sanitizeUserId("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")).toBe(
				"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
			);
		});

		it("throws S3ValidationError on empty or whitespace user ID", () => {
			expect(() => sanitizeUserId("")).toThrow(S3ValidationError);
			expect(() => sanitizeUserId("   ")).toThrow(S3ValidationError);
		});

		it("rejects path traversal attempts in user ID", () => {
			expect(() => sanitizeUserId("../admin")).toThrow(S3ValidationError);
			expect(() => sanitizeUserId("user/123")).toThrow(S3ValidationError);
			expect(() => sanitizeUserId("user\\123")).toThrow(
				S3ValidationError
			);
			expect(() => sanitizeUserId("user..name")).toThrow(
				S3ValidationError
			);
		});
	});

	describe("sanitizeJobId", () => {
		it("accepts valid alphanumeric, hyphen, and underscore job IDs", () => {
			expect(sanitizeJobId("job-456_xyz")).toBe("job-456_xyz");
		});

		it("throws S3ValidationError on empty or traversal job ID", () => {
			expect(() => sanitizeJobId("")).toThrow(S3ValidationError);
			expect(() => sanitizeJobId("../job")).toThrow(S3ValidationError);
		});
	});

	describe("sanitizeCategory", () => {
		it("normalizes category to lowercase alphanumeric", () => {
			expect(sanitizeCategory("Exports")).toBe("exports");
			expect(sanitizeCategory("private-exports")).toBe("private-exports");
		});

		it("rejects path traversal and illegal characters in category", () => {
			expect(() => sanitizeCategory("../root")).toThrow(
				S3ValidationError
			);
			expect(() => sanitizeCategory("docs/private")).toThrow(
				S3ValidationError
			);
			expect(() => sanitizeCategory("")).toThrow(S3ValidationError);
		});
	});

	describe("sanitizeFilename", () => {
		it("normalizes whitespace and removes trailing slashes", () => {
			expect(sanitizeFilename("data export 2026.csv")).toBe(
				"data-export-2026.csv"
			);
			expect(sanitizeFilename("data   report.csv")).toBe(
				"data-report.csv"
			);
		});

		it("strips path traversal sequences", () => {
			expect(sanitizeFilename("../../../etc/passwd")).toBe("etc/passwd");
		});

		it("throws on empty or traversal-only names", () => {
			expect(() => sanitizeFilename("")).toThrow(S3ValidationError);
			expect(() => sanitizeFilename("..")).toThrow(S3ValidationError);
			expect(() => sanitizeFilename(".")).toThrow(S3ValidationError);
		});
	});

	describe("key builders (rooted in t/ for R2 1-day lifecycle)", () => {
		it("builds user prefix rooted in t/ with trailing slash", () => {
			expect(buildUserPrefix("user-42")).toBe("t/users/user-42/");
		});

		it("builds user ephemeral key rooted in t/", () => {
			const key = buildUserEphemeralKey(
				"user-42",
				"exports",
				"financial-2026.pdf"
			);
			expect(key).toBe("t/users/user-42/exports/financial-2026.pdf");
			expect(key.startsWith(`${EPHEMERAL_ROOT}/`)).toBe(true);
		});

		it("builds user ephemeral key using object signature", () => {
			const key = buildUserEphemeralKey({
				userId: "user-42",
				category: "reports",
				filename: "annual.csv",
			});
			expect(key).toBe("t/users/user-42/reports/annual.csv");
		});

		it("supports buildUserFileKey as alias", () => {
			const key = buildUserFileKey("user-42", "temp", "scratch.json");
			expect(key).toBe("t/users/user-42/temp/scratch.json");
		});

		it("builds artifact prefix rooted in t/", () => {
			expect(buildArtifactPrefix("job-100")).toBe("t/artifacts/job-100/");
		});

		it("builds artifact key rooted in t/", () => {
			const key = buildArtifactKey("job-100", "output.mp4");
			expect(key).toBe("t/artifacts/job-100/output.mp4");
		});

		it("builds generic ephemeral key rooted in t/", () => {
			const key = buildEphemeralKey("cache", "buffer.bin");
			expect(key).toBe("t/cache/buffer.bin");
		});
	});

	describe("key parsers", () => {
		it("parses user ephemeral key", () => {
			const parsed = parseEphemeralKey(
				"t/users/u123/documents/report.pdf"
			);
			expect(parsed).toEqual({
				type: "user",
				userId: "u123",
				category: "documents",
				filename: "report.pdf",
			});
		});

		it("parses artifact key", () => {
			const parsed = parseEphemeralKey("t/artifacts/job-99/output.csv");
			expect(parsed).toEqual({
				type: "artifact",
				jobId: "job-99",
				filename: "output.csv",
			});
		});

		it("parses user storage key with parseUserStorageKey", () => {
			const parsed = parseUserStorageKey(
				"t/users/u123/documents/report.pdf"
			);
			expect(parsed).toEqual({
				userId: "u123",
				category: "documents",
				filename: "report.pdf",
			});
		});

		it("returns null for non-ephemeral or invalid keys", () => {
			expect(parseEphemeralKey("")).toBeNull();
			expect(parseEphemeralKey("public/logo.png")).toBeNull();
		});
	});
});
