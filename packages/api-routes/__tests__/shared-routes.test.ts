import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify, { type FastifySchema } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../src";
import { SHARED_ROUTE_KEYS, sharedRoutes } from "../src";

interface CapturedRoute {
	method: string;
	url: string;
	schema: FastifySchema & {
		description?: string;
		consumes?: string[];
		headers?: unknown;
	};
}

const BASE_OPTIONS: SharedRoutesOptions = {
	uploadAudioToStorage: false,
	declareAudioResponseHeader: false,
};

const ROUTE_TABLE: Array<[string, string]> = [
	["POST", "/create_clone_voice"],
	["GET", "/get_models"],
	["GET", "/get_voices"],
	["POST", "/music_compose"],
	["POST", "/music_compose_plan"],
	["POST", "/speech_to_speech"],
	["POST", "/text_to_dialogue"],
	["POST", "/text_to_speech"],
	["POST", "/text_to_speech/with_timestamp"],
	["GET", "/get_media"],
	["POST", "/clothes_segmentation"],
	["POST", "/expression_generation"],
	["POST", "/image_restoration"],
	["POST", "/outpainting"],
	["POST", "/remove_bg"],
	["POST", "/versatile_hairstyle"],
	["POST", "/create_task"],
	["GET", "/get_content"],
];

const capture = async (
	options: SharedRoutesOptions
): Promise<CapturedRoute[]> => {
	const routes: CapturedRoute[] = [];
	const app = Fastify();

	// The apps compile the route schemas with Zod; the route module is written
	// against that compiler.
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

	app.addHook("onRoute", (routeOptions) => {
		// Fastify derives a HEAD route from every GET route; the table below
		// lists the routes the apps declare.
		if (routeOptions.method === "HEAD") {
			return;
		}

		routes.push({
			method: Array.isArray(routeOptions.method)
				? routeOptions.method.join(",")
				: String(routeOptions.method),
			url: routeOptions.url,
			schema: routeOptions.schema as CapturedRoute["schema"],
		});
	});

	await app.register(sharedRoutes, options);
	await app.ready();
	await app.close();

	return routes;
};

const find = (routes: CapturedRoute[], url: string): CapturedRoute => {
	const route = routes.find((candidate) => candidate.url === url);
	if (!route) {
		throw new Error(`route ${url} is not registered`);
	}
	return route;
};

describe("shared routes", () => {
	it("registers the same route table for every app", async () => {
		const routes = await capture(BASE_OPTIONS);

		expect(
			routes.map((route) => [route.method, route.url] as [string, string])
		).toEqual(ROUTE_TABLE);
	});

	it("registers one route per key of the shared surface", async () => {
		const routes = await capture(BASE_OPTIONS);

		expect(routes).toHaveLength(SHARED_ROUTE_KEYS.length);
	});

	it("registers the same route table when the app differs", async () => {
		const routes = await capture({
			uploadAudioToStorage: true,
			audioStorage: {
				uploadBase64Audio: async (_request, audio) =>
					`https://cdn.test/${audio}`,
			},
			declareAudioResponseHeader: true,
			descriptions: { textToDialogue: "A richer description." },
			consumes: { createIvcVoice: ["multipart/form-data"] },
		});

		expect(
			routes.map((route) => [route.method, route.url] as [string, string])
		).toEqual(ROUTE_TABLE);
	});

	it("declares the audio format header only when the app asks for it", async () => {
		const without = await capture(BASE_OPTIONS);
		const declared = await capture({
			...BASE_OPTIONS,
			declareAudioResponseHeader: true,
		});

		const audioRoutes = [
			"/music_compose",
			"/speech_to_speech",
			"/text_to_dialogue",
			"/text_to_speech",
		];

		for (const url of audioRoutes) {
			expect(find(without, url).schema.headers).toBeUndefined();
			expect(find(declared, url).schema.headers).toBeDefined();
		}

		for (const url of [
			"/create_clone_voice",
			"/get_models",
			"/get_voices",
			"/music_compose_plan",
			"/text_to_speech/with_timestamp",
		]) {
			expect(find(without, url).schema.headers).toBeUndefined();
			expect(find(declared, url).schema.headers).toBeUndefined();
		}
	});

	it("keeps the consumes of a route in the options", async () => {
		const defaults = await capture(BASE_OPTIONS);
		expect(find(defaults, "/create_clone_voice").schema.consumes).toEqual([
			"application/json",
		]);

		const multipart = await capture({
			...BASE_OPTIONS,
			consumes: { createIvcVoice: ["multipart/form-data"] },
		});
		expect(find(multipart, "/create_clone_voice").schema.consumes).toEqual([
			"multipart/form-data",
		]);

		expect(find(defaults, "/music_compose").schema.consumes).toEqual([
			"application/json",
		]);
		expect(find(defaults, "/speech_to_speech").schema.consumes).toEqual([
			"application/json",
			"multipart/form-data",
		]);
	});

	it("keeps the description of a route in the options", async () => {
		const defaults = await capture(BASE_OPTIONS);
		expect(find(defaults, "/text_to_dialogue").schema.description).toBe(
			"Convert text to dialogue."
		);
		expect(find(defaults, "/get_models").schema.description).toBe(
			"Get available models"
		);

		const described = await capture({
			...BASE_OPTIONS,
			descriptions: { textToDialogue: "A richer description." },
		});
		expect(find(described, "/text_to_dialogue").schema.description).toBe(
			"A richer description."
		);
		expect(find(described, "/get_models").schema.description).toBe(
			"Get available models"
		);
	});
});
