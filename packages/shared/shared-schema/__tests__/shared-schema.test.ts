import {
	SharedFileBufferSchema,
	SharedImageSchema,
	SharedSyncTimeoutSchema,
} from "../src";

describe("shared/shared-schema", () => {
	describe("SharedSyncTimeoutSchema", () => {
		it("validates timeout within range", () => {
			expect(SharedSyncTimeoutSchema.safeParse(30).success).toBe(true);
			expect(SharedSyncTimeoutSchema.safeParse(-1).success).toBe(true);
			expect(SharedSyncTimeoutSchema.safeParse(60).success).toBe(true);
			expect(SharedSyncTimeoutSchema.safeParse(100).success).toBe(false);
			expect(SharedSyncTimeoutSchema.safeParse(-5).success).toBe(false);
		});
	});

	describe("SharedImageSchema", () => {
		it("transforms valid URL image", () => {
			const parsed = SharedImageSchema.safeParse(
				"https://example.com/img.png"
			);
			expect(parsed.success).toBe(true);
			if (parsed.success) {
				expect(parsed.data).toEqual({
					type: "url",
					value: "https://example.com/img.png",
				});
			}
		});

		it("transforms valid base64 image", () => {
			const base64 = "aGVsbG8gd29ybGQ=";
			const parsed = SharedImageSchema.safeParse(base64);
			expect(parsed.success).toBe(true);
			if (parsed.success) {
				expect(parsed.data).toEqual({
					type: "jpg",
					value: base64,
				});
			}
		});
	});

	describe("SharedFileBufferSchema", () => {
		it("validates Buffer instance", () => {
			const buf = Buffer.from("hello");
			expect(SharedFileBufferSchema.safeParse(buf).success).toBe(true);
			expect(SharedFileBufferSchema.safeParse("string").success).toBe(
				false
			);
		});
	});
});
