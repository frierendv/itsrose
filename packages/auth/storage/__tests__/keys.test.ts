import { StorageValidationError } from "@itsrose/s3";
import {
	ASSET_ROOT,
	buildArtifactKey,
	buildArtifactPrefix,
	buildEphemeralKey,
	buildUserAssetKey,
	buildUserEphemeralKey,
	buildUserFileKey,
	buildUserPrefix,
	EPHEMERAL_ROOT,
	parseEphemeralKey,
	parseStorageKey,
	parseUserStorageKey,
	sanitizeCategory,
	sanitizeFilename,
	sanitizeJobId,
	sanitizeUserId,
} from "../src/keys";

describe("packages/auth/storage/keys", () => {
	describe("sanitizeUserId", () => {
		it("accepts valid alphanumeric, hyphen, and underscore user IDs", () => {
			expect(sanitizeUserId("user-123_abc")).toBe("user-123_abc");
			expect(sanitizeUserId("f81d4fae-7dec-11d0-a765-00a0c91e6bf6")).toBe(
				"f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
			);
		});

		it("throws StorageValidationError on empty or whitespace user ID", () => {
			expect(() => sanitizeUserId("")).toThrow(StorageValidationError);
			expect(() => sanitizeUserId("   ")).toThrow(StorageValidationError);
		});

		it("rejects path traversal attempts in user ID", () => {
			expect(() => sanitizeUserId("../admin")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeUserId("user/123")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeUserId("user\\123")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeUserId("user..name")).toThrow(
				StorageValidationError
			);
		});
	});

	describe("sanitizeJobId", () => {
		it("accepts valid alphanumeric, hyphen, and underscore job IDs", () => {
			expect(sanitizeJobId("job-456_xyz")).toBe("job-456_xyz");
		});

		it("throws StorageValidationError on empty or traversal job ID", () => {
			expect(() => sanitizeJobId("")).toThrow(StorageValidationError);
			expect(() => sanitizeJobId("../job")).toThrow(
				StorageValidationError
			);
		});
	});

	describe("sanitizeCategory", () => {
		it("normalizes category to lowercase alphanumeric", () => {
			expect(sanitizeCategory("Exports")).toBe("exports");
			expect(sanitizeCategory("private-exports")).toBe("private-exports");
		});

		it("rejects path traversal and illegal characters in category", () => {
			expect(() => sanitizeCategory("../root")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeCategory("docs/private")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeCategory("")).toThrow(StorageValidationError);
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
			expect(() => sanitizeFilename("")).toThrow(StorageValidationError);
			expect(() => sanitizeFilename("..")).toThrow(
				StorageValidationError
			);
			expect(() => sanitizeFilename(".")).toThrow(StorageValidationError);
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
			expect(
				parseEphemeralKey(
					"assets/users/u123/voice_sample/asset-1/sample.wav"
				)
			).toBeNull();
		});
	});

	describe("durable asset keys", () => {
		const assetParams = {
			userId: "user-42",
			kind: "voice_sample",
			assetId: "01J8Z4Q7Y3N9V5K2M6P0R1S8T4",
			filename: "sample.wav",
		} as const;

		it("builds a durable key rooted in assets/", () => {
			const key = buildUserAssetKey(assetParams);
			expect(key).toBe(
				"assets/users/user-42/voice_sample/01J8Z4Q7Y3N9V5K2M6P0R1S8T4/sample.wav"
			);
			expect(key.startsWith(`${ASSET_ROOT}/`)).toBe(true);
		});

		it("round-trips the builder through parseStorageKey", () => {
			const key = buildUserAssetKey(assetParams);
			expect(parseStorageKey(key)).toEqual({
				root: "asset",
				type: "asset",
				userId: "user-42",
				kind: "voice_sample",
				assetId: "01J8Z4Q7Y3N9V5K2M6P0R1S8T4",
				filename: "sample.wav",
			});
		});

		it("sanitizes the user id, asset id and filename", () => {
			const key = buildUserAssetKey({
				userId: " user-42 ",
				kind: "voice_sample",
				assetId: " asset_01 ",
				filename: "my voice  sample.wav",
			});
			expect(key).toBe(
				"assets/users/user-42/voice_sample/asset_01/my-voice-sample.wav"
			);
		});

		it("rejects unsafe asset key segments", () => {
			expect(() =>
				buildUserAssetKey({ ...assetParams, userId: "../admin" })
			).toThrow(StorageValidationError);
			expect(() =>
				buildUserAssetKey({ ...assetParams, assetId: "a/b" })
			).toThrow(StorageValidationError);
			expect(() =>
				buildUserAssetKey({ ...assetParams, filename: ".." })
			).toThrow(StorageValidationError);
		});

		it("parses both roots with parseStorageKey", () => {
			expect(
				parseStorageKey("t/users/u123/documents/report.pdf")
			).toEqual({
				root: "ephemeral",
				type: "user",
				userId: "u123",
				category: "documents",
				filename: "report.pdf",
			});
			expect(
				parseStorageKey(
					"assets/users/u123/voice_sample/asset-1/sample.wav"
				)
			).toEqual({
				root: "asset",
				type: "asset",
				userId: "u123",
				kind: "voice_sample",
				assetId: "asset-1",
				filename: "sample.wav",
			});
		});

		it("returns null for a key outside both roots or a malformed asset key", () => {
			expect(parseStorageKey("")).toBeNull();
			expect(parseStorageKey("public/logo.png")).toBeNull();
			expect(
				parseStorageKey("assets/users/u123/voice_sample/asset-1")
			).toBeNull();
			expect(
				parseStorageKey("assets/artifacts/job-1/output.mp4")
			).toBeNull();
		});

		it("parses a durable asset with parseUserStorageKey", () => {
			const key = buildUserAssetKey(assetParams);
			expect(parseUserStorageKey(key)).toEqual({
				root: "asset",
				userId: "user-42",
				category: "voice_sample",
				kind: "voice_sample",
				assetId: "01J8Z4Q7Y3N9V5K2M6P0R1S8T4",
				filename: "sample.wav",
			});
		});
	});
});
