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
import { pixverseRoutes } from "../src/pixverse";
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
	await app.register(pixverseRoutes, {});
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
			name: "a text-to-video task of the pixverse surface",
			method: "POST",
			url: "/pixverse/text_to_video",
			payload: {
				model: "v6-max",
				prompt: "A blue glass marble rolls across a clean white table",
				duration: 1,
				quality: "360p",
				aspect_ratio: "1:1",
			},
		},
		{
			name: "an image-to-video task of the pixverse surface",
			method: "POST",
			url: "/pixverse/image_to_video",
			payload: {
				model: "v6",
				prompt: "The cup begins to steam",
				duration: 5,
				quality: "720p",
				aspect_ratio: "16:9",
				img_id: 123456,
			},
		},
		{
			name: "the task of the pixverse surface",
			method: "GET",
			url: "/pixverse/get_task?task_id=1000000000000003",
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

describe("the pixverse surface", () => {
	let app: FastifyInstance;

	beforeAll(async () => {
		app = await build();
	});

	afterAll(async () => {
		await app.close();
	});

	it("answers a created task in the translated vocabulary", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/pixverse/text_to_video",
			payload: {
				model: "v6-max",
				prompt: "A blue glass marble rolls across a clean white table",
				duration: 1,
				quality: "360p",
				aspect_ratio: "1:1",
			},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toStrictEqual({
			ok: true,
			code: expect.any(Number) as number,
			message: expect.any(String) as string,
			data: {
				status: "in_progress",
				task_id: "1000000000000003",
				credits: 10,
			},
			errors: null,
			meta: {},
		});
	});

	it("answers a completed task with media and no upstream fields", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/pixverse/get_task?task_id=1000000000000003",
		});

		expect(response.statusCode).toBe(200);

		const body = response.json();
		expect(body.data.status).toBe("completed");
		expect(body.data.media_list).toStrictEqual([
			"https://pixverse.test/result.mp4",
		]);
		// the upstream numeric status and its camelCase dimensions never
		// reach the wire
		expect(body.data).not.toHaveProperty("video_id");
		expect(body.data).not.toHaveProperty("outputWidth");
		expect(typeof body.data.status).toBe("string");
	});

	it("refuses a request the upstream contract cannot accept", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/pixverse/text_to_video",
			payload: {
				model: "v6-max",
				prompt: "a prompt",
				duration: 1,
				quality: "4k",
				aspect_ratio: "1:1",
			},
		});

		// the request never reaches PixVerse: the published contract is
		// enforced at the route
		expect(response.statusCode).toBe(400);
	});
});
