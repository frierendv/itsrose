import type { FastifyRequest } from "fastify";
import {
	uploadAudio,
	uploadUnlessBase64,
	uploadWhenUrlRequested,
} from "../src/audio";
import type { SharedRoutesOptions } from "../src/options";

const request = {} as FastifyRequest;

const withPort = (
	uploadBase64Audio: () => Promise<string>
): SharedRoutesOptions => ({
	uploadAudioToStorage: true,
	audioStorage: { uploadBase64Audio },
	declareAudioResponseHeader: false,
});

describe("audio upload conditions", () => {
	it("uploads unless the caller asked for the inline payload", () => {
		expect(uploadUnlessBase64("base64")).toBe(false);
		expect(uploadUnlessBase64("url")).toBe(true);
		expect(uploadUnlessBase64(undefined)).toBe(true);
	});

	it("uploads only when the caller asked for a url", () => {
		expect(uploadWhenUrlRequested("url")).toBe(true);
		expect(uploadWhenUrlRequested("base64")).toBe(false);
		expect(uploadWhenUrlRequested(undefined)).toBe(false);
	});
});

describe("uploadAudio", () => {
	it("returns the inline payload when the app does not upload", async () => {
		const options: SharedRoutesOptions = {
			uploadAudioToStorage: false,
			declareAudioResponseHeader: false,
		};

		await expect(
			uploadAudio(
				request,
				"payload",
				"url",
				uploadWhenUrlRequested,
				options
			)
		).resolves.toBe("payload");
	});

	it("returns the inline payload when the route does not upload this format", async () => {
		const options = withPort(async () => "https://cdn.test/audio");

		await expect(
			uploadAudio(
				request,
				"payload",
				"base64",
				uploadWhenUrlRequested,
				options
			)
		).resolves.toBe("payload");
	});

	it("hands the audio to the port of the app", async () => {
		const options = withPort(async () => "https://cdn.test/audio");

		await expect(
			uploadAudio(
				request,
				"payload",
				"url",
				uploadWhenUrlRequested,
				options
			)
		).resolves.toBe("https://cdn.test/audio");
	});
});
