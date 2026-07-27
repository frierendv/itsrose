/* eslint-disable turbo/no-undeclared-env-vars */
import { TiktokRequestSchema } from "../src/zod-schema/request";

describe("features/tiktok", () => {
	beforeAll(() => {
		process.env.TIKTOK_TIKWM_BASE_URL = "https://tikwm.com/api";
		process.env.TIKTOK_TIKWM_APIKEY = "test_key";
	});

	describe("TiktokRequestSchema", () => {
		it("validates valid TikTok URL", () => {
			const payload = {
				url: "https://www.tiktok.com/@user/video/123456789",
			};
			const result = TiktokRequestSchema.safeParse(payload);
			expect(result.success).toBe(true);
		});

		it("fails on invalid URL", () => {
			const payload = { url: "not-a-url" };
			const result = TiktokRequestSchema.safeParse(payload);
			expect(result.success).toBe(false);
		});
	});

	describe("TikTok Config", () => {
		it("loads environment configuration", async () => {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			const { TIKTOK_TIKWM_BASE_URL, TIKWM_APIKEY } =
				await import("../src/config");
			expect(TIKTOK_TIKWM_BASE_URL).toBe("https://tikwm.com/api");
			expect(TIKWM_APIKEY).toBe("test_key");
		});
	});
});
