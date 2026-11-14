import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../src";
import { sharedRoutes } from "../src";

const build = async (options: SharedRoutesOptions) => {
	const app = Fastify();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify(value) {
				if (
					value instanceof SuccessResponse ||
					value instanceof FailureResponse
				) {
					return JSON.stringify(value);
				}
				return JSON.stringify(
					new SuccessResponse({ data: value, code: "OK" })
				);
			},
		})
	);

	await app.register(sharedRoutes, options);
	await app.ready();

	return app;
};

const VOICE = {
	text: "Hello world",
	voice_id: "JBFv24vM44z56z111111",
};

const PROMPT = {
	prompt: "A song about the sea",
};

describe("the audio routes of the shared surface", () => {
	it("uploads the audio of /music_compose unless base64 was asked for", async () => {
		const uploaded: string[] = [];
		const app = await build({
			uploadAudioToStorage: true,
			audioStorage: {
				uploadBase64Audio: async (_request, audio) => {
					uploaded.push(audio);
					return "https://cdn.test/audio";
				},
			},
			declareAudioResponseHeader: true,
		});

		await app.inject({
			method: "POST",
			url: "/music_compose",
			headers: { "response-audio-format": "base64" },
			payload: PROMPT,
		});
		expect(uploaded).toEqual([]);

		await app.inject({
			method: "POST",
			url: "/music_compose",
			headers: { "response-audio-format": "url" },
			payload: PROMPT,
		});
		expect(uploaded).toEqual(["music-audio"]);

		await app.close();
	});

	it("uploads the audio of /text_to_speech only when a url was asked for", async () => {
		const uploaded: string[] = [];
		const app = await build({
			uploadAudioToStorage: true,
			audioStorage: {
				uploadBase64Audio: async (_request, audio) => {
					uploaded.push(audio);
					return "https://cdn.test/audio";
				},
			},
			declareAudioResponseHeader: true,
		});

		await app.inject({
			method: "POST",
			url: "/text_to_speech",
			headers: { "response-audio-format": "base64" },
			payload: VOICE,
		});
		expect(uploaded).toEqual([]);

		await app.inject({
			method: "POST",
			url: "/text_to_speech",
			headers: { "response-audio-format": "url" },
			payload: VOICE,
		});
		expect(uploaded).toEqual(["speech-audio"]);

		await app.close();
	});

	it("returns the audio inline when the app does not upload", async () => {
		const uploaded: string[] = [];
		const app = await build({
			uploadAudioToStorage: false,
			declareAudioResponseHeader: false,
		});

		await app.inject({
			method: "POST",
			url: "/music_compose",
			headers: { "response-audio-format": "url" },
			payload: PROMPT,
		});

		expect(uploaded).toEqual([]);
		await app.close();
	});
});
