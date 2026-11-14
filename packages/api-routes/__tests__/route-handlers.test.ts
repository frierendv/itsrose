import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { audioRoutes } from "../src/audio";
import { characterAiRoutes } from "../src/character-ai";
import { instagramRoutes } from "../src/instagram";
import { mtxxRoutes } from "../src/mtxx";
import { reminiRoutes } from "../src/remini";
import { tiktokRoutes } from "../src/tiktok";

const IMAGE =
	"https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg";

const build = async (): Promise<FastifyInstance> => {
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

	await app.register(audioRoutes, {
		uploadAudioToStorage: false,
		declareAudioResponseHeader: false,
	});
	await app.register(characterAiRoutes, {});
	await app.register(instagramRoutes, {});
	await app.register(mtxxRoutes, {});
	await app.register(reminiRoutes, {});
	await app.register(tiktokRoutes, {});
	await app.ready();

	return app;
};

describe("the route handlers", () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await build();
	});

	afterAll(async () => {
		await app.close();
	});

	const cases: Array<{
		name: string;
		method: "GET" | "POST";
		url: string;
		payload?: Record<string, unknown>;
	}> = [
		{
			name: "the models of the audio surface",
			method: "GET",
			url: "/audio/get_models",
		},
		{
			name: "the voices of the audio surface",
			method: "GET",
			url: "/audio/get_voices?voice_id=JBFv24vM44z56z111111",
		},
		{
			name: "the plan of a music composition",
			method: "POST",
			url: "/audio/music_compose_plan",
			payload: { prompt: "A song about the sea", model_id: "music_v1" },
		},
		{
			name: "the speech of the audio surface",
			method: "POST",
			url: "/audio/speech_to_speech",
			payload: { voice_id: "JBFv24vM44z56z111111" },
		},
		{
			name: "the dialogue of the audio surface",
			method: "POST",
			url: "/audio/text_to_dialogue",
			payload: {
				inputs: [
					{ text: "Hello world", voice_id: "JBFv24vM44z56z111111" },
				],
			},
		},
		{
			name: "the timing of the speech",
			method: "POST",
			url: "/audio/text_to_speech/with_timestamp",
			payload: {
				text: "Hello world",
				voice_id: "JBFv24vM44z56z111111",
			},
		},
		{
			name: "the characters of the character.ai surface",
			method: "GET",
			url: "/character_ai/search_character?query=Eula",
		},
		{
			name: "the message of the character.ai surface",
			method: "POST",
			url: "/character_ai/send_message",
			payload: { external_id: "char", message: "Hello" },
		},
		{
			name: "the media of the instagram surface",
			method: "GET",
			url: "/instagram/get_media?url=https://www.instagram.com/p/test/",
		},
		{
			name: "the clothes of the mtxx surface",
			method: "POST",
			url: "/mtxx/clothes_segmentation",
			payload: { init_image: IMAGE, sync_timeout: 30 },
		},
		{
			name: "the expression of the mtxx surface",
			method: "POST",
			url: "/mtxx/expression_generation",
			payload: { init_image: IMAGE, sync_timeout: 30, smile_mode: 1 },
		},
		{
			name: "the restoration of the mtxx surface",
			method: "POST",
			url: "/mtxx/image_restoration",
			payload: { init_image: IMAGE, sync_timeout: 30 },
		},
		{
			name: "the outpainting of the mtxx surface",
			method: "POST",
			url: "/mtxx/outpainting",
			payload: { init_image: IMAGE, sync_timeout: 30, expand_ratio: 0.2 },
		},
		{
			name: "the background of the mtxx surface",
			method: "POST",
			url: "/mtxx/remove_bg",
			payload: { init_image: IMAGE, sync_timeout: 30 },
		},
		{
			name: "the hairstyle of the mtxx surface",
			method: "POST",
			url: "/mtxx/versatile_hairstyle",
			payload: {
				init_image: IMAGE,
				sync_timeout: 30,
				hair_type: "short",
			},
		},
		{
			name: "the task of the mtxx surface",
			method: "GET",
			url: "/mtxx/get_task?task_id=task",
		},
		{
			name: "the task of the remini surface",
			method: "POST",
			url: "/remini/create_task",
			payload: { init_image: IMAGE, pipelines: [{}] },
		},
		{
			name: "the content of the tiktok surface",
			method: "GET",
			url: "/tiktok/get_content?url=https://www.tiktok.com/@user/video/1",
		},
	];

	it.each(cases)("serves $name", async ({ method, url, payload }) => {
		const response = await app.inject({ method, url, payload });

		expect([response.statusCode, response.body]).toEqual([
			200,
			expect.any(String),
		]);
	});
});
