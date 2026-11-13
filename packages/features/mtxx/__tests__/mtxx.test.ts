import { createMediaProfile, createSDKParameter } from "../src/utils/parameter";
import { generateUUID } from "../src/utils/uuid";

describe("features/mtxx", () => {
	describe("generateUUID", () => {
		it("generates uuid prefixed with domain name", () => {
			const uuid = generateUUID();
			expect(uuid).toBeDefined();
			expect(uuid.startsWith("itsrose_mtxx")).toBe(true);
		});
	});

	describe("SDK parameter helpers", () => {
		it("creates media profile object from init image", () => {
			const initImage = {
				type: "url" as const,
				value: "https://example.com/image.jpg",
			};
			const profile = createMediaProfile(initImage);
			expect(profile.url).toBe("https://example.com/image.jpg");
			expect(profile.profile.media_profiles.media_data_type).toBe("url");
		});

		it("formats SDK parameter payload", () => {
			const sdkParam = createSDKParameter({
				task: "transform",
				task_type: "image",
				params: { style: "anime" },
			});
			expect(sdkParam.task).toBe("transform");
			expect(sdkParam.params).toBe(JSON.stringify({ style: "anime" }));
			expect(sdkParam.task_id).toContain("itsrose_mtxx");
			expect(sdkParam.sync_timeout).toBe(60);
			// Test string params
			const sdkParamString = createSDKParameter({
				task: "transform",
				task_type: "image",
				params: "already-stringified",
			});
			expect(sdkParamString.params).toBe("already-stringified");
		});

		it("keeps the sync timeout default when the caller omits the field", () => {
			// Every operation forwards a `sync_timeout` key, so when a caller
			// omits it the key is present with the value `undefined`. A default
			// applied before the spread would be overwritten by it, and the
			// field would be dropped entirely.
			const sdkParam = createSDKParameter({
				task: "transform",
				task_type: "image",
				params: {},
				sync_timeout: undefined,
			});
			expect(sdkParam.sync_timeout).toBe(60);
		});

		it("honours an explicit sync timeout", () => {
			const sdkParam = createSDKParameter({
				task: "transform",
				task_type: "image",
				params: {},
				sync_timeout: 30,
			});
			expect(sdkParam.sync_timeout).toBe(30);
		});
	});
});
