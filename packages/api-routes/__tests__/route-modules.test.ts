import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify, { type FastifyInstance, type FastifySchema } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import {
	AUDIO_ROUTE_KEYS,
	AUDIO_ROUTE_PREFIX,
	audioRoutes,
} from "../src/audio";
import {
	CHARACTER_AI_ROUTE_KEYS,
	CHARACTER_AI_ROUTE_PREFIX,
	characterAiRoutes,
} from "../src/character-ai";
import {
	INSTAGRAM_ROUTE_KEYS,
	INSTAGRAM_ROUTE_PREFIX,
	instagramRoutes,
} from "../src/instagram";
import { MTXX_ROUTE_KEYS, MTXX_ROUTE_PREFIX, mtxxRoutes } from "../src/mtxx";
import {
	PIXVERSE_ROUTE_KEYS,
	PIXVERSE_ROUTE_PREFIX,
	pixverseRoutes,
} from "../src/pixverse";
import {
	REMINI_ROUTE_KEYS,
	REMINI_ROUTE_PREFIX,
	reminiRoutes,
} from "../src/remini";
import {
	TIKTOK_ROUTE_KEYS,
	TIKTOK_ROUTE_PREFIX,
	tiktokRoutes,
} from "../src/tiktok";

interface CapturedRoute {
	method: string;
	url: string;
	schema: FastifySchema & {
		description?: string;
		consumes?: string[];
		headers?: unknown;
	};
}

/**
 * Registers the modules of an application and returns the routes it serves.
 *
 * @param register - Registers the modules on the application.
 * @returns The routes the application serves.
 */
const capture = async (
	register: (app: FastifyInstance) => Promise<void>
): Promise<CapturedRoute[]> => {
	const routes: CapturedRoute[] = [];
	const app = Fastify();

	// The apps compile the route schemas with Zod; the route modules are
	// written against that compiler.
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
		// Fastify derives a HEAD route from every GET route; the tables below
		// list the routes the apps declare.
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

	await register(app);
	await app.ready();
	await app.close();

	return routes;
};

const table = (routes: CapturedRoute[]): Array<[string, string]> =>
	routes.map((route) => [route.method, route.url] as [string, string]);

const find = (routes: CapturedRoute[], url: string): CapturedRoute => {
	const route = routes.find((candidate) => candidate.url === url);
	if (!route) {
		throw new Error(`route ${url} is not registered`);
	}
	return route;
};

const AUDIO_OPTIONS = {
	declareAudioResponseHeader: false,
} as const;

const AUDIO_TABLE: Array<[string, string]> = [
	["POST", "/audio/create_clone_voice"],
	["DELETE", "/audio/voices/:voice_id"],
	["GET", "/audio/get_models"],
	["GET", "/audio/get_voices"],
	["POST", "/audio/music_compose"],
	["POST", "/audio/music_compose_plan"],
	["POST", "/audio/speech_to_speech"],
	["POST", "/audio/text_to_dialogue"],
	["POST", "/audio/text_to_speech"],
	["POST", "/audio/text_to_speech/with_timestamp"],
];

const CHARACTER_AI_TABLE: Array<[string, string]> = [
	["GET", "/character_ai/search_character"],
	["POST", "/character_ai/send_message"],
	["GET", "/character_ai/character_info"],
];

const INSTAGRAM_TABLE: Array<[string, string]> = [
	["GET", "/instagram/get_media"],
];

const MTXX_TABLE: Array<[string, string]> = [
	["POST", "/mtxx/clothes_segmentation"],
	["POST", "/mtxx/expression_generation"],
	["GET", "/mtxx/get_task"],
	["POST", "/mtxx/image_restoration"],
	["POST", "/mtxx/outpainting"],
	["POST", "/mtxx/remove_bg"],
	["POST", "/mtxx/versatile_hairstyle"],
];

const PIXVERSE_TABLE: Array<[string, string]> = [
	["POST", "/pixverse/text_to_video"],
	["POST", "/pixverse/image_to_video"],
	["GET", "/pixverse/get_task"],
];

const REMINI_TABLE: Array<[string, string]> = [["POST", "/remini/create_task"]];

const TIKTOK_TABLE: Array<[string, string]> = [["GET", "/tiktok/get_content"]];

describe("the route modules", () => {
	it("serves the audio routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
			});
		});

		expect(table(routes)).toEqual(AUDIO_TABLE);
		expect(routes).toHaveLength(AUDIO_ROUTE_KEYS.length);
	});

	it("serves the character.ai routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(characterAiRoutes, {
				prefix: CHARACTER_AI_ROUTE_PREFIX,
			});
		});

		expect(table(routes)).toEqual(CHARACTER_AI_TABLE);
		expect(routes).toHaveLength(CHARACTER_AI_ROUTE_KEYS.length);
	});

	it("serves the instagram routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(instagramRoutes, {
				prefix: INSTAGRAM_ROUTE_PREFIX,
			});
		});

		expect(table(routes)).toEqual(INSTAGRAM_TABLE);
		expect(routes).toHaveLength(INSTAGRAM_ROUTE_KEYS.length);
	});

	it("serves the mtxx routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
		});

		expect(table(routes)).toEqual(MTXX_TABLE);
		expect(routes).toHaveLength(MTXX_ROUTE_KEYS.length);
	});

	it("serves the pixverse routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(pixverseRoutes, {
				prefix: PIXVERSE_ROUTE_PREFIX,
			});
		});

		expect(table(routes)).toEqual(PIXVERSE_TABLE);
		expect(routes).toHaveLength(PIXVERSE_ROUTE_KEYS.length);
	});

	it("serves the remini routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(reminiRoutes, { prefix: REMINI_ROUTE_PREFIX });
		});

		expect(table(routes)).toEqual(REMINI_TABLE);
		expect(routes).toHaveLength(REMINI_ROUTE_KEYS.length);
	});

	it("serves the tiktok routes under the prefix the app registers", async () => {
		const routes = await capture(async (app) => {
			await app.register(tiktokRoutes, { prefix: TIKTOK_ROUTE_PREFIX });
		});

		expect(table(routes)).toEqual(TIKTOK_TABLE);
		expect(routes).toHaveLength(TIKTOK_ROUTE_KEYS.length);
	});

	it("serves a module under the prefix the app asks for", async () => {
		const routes = await capture(async (app) => {
			await app.register(tiktokRoutes, { prefix: "/download" });
		});

		expect(table(routes)).toEqual([["GET", "/download/get_content"]]);
	});

	it("serves a module at the root when the app asks for it", async () => {
		const routes = await capture(async (app) => {
			await app.register(tiktokRoutes, { prefix: "" });
		});

		expect(table(routes)).toEqual([["GET", "/get_content"]]);
	});

	it("serves only the modules the app registered", async () => {
		const routes = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
			});
			await app.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
		});

		const urls = routes.map((route) => route.url);

		expect(urls).toContain("/audio/text_to_speech");
		expect(urls).toContain("/mtxx/remove_bg");
		expect(urls).not.toContain("/tiktok/get_content");
		expect(urls).not.toContain("/character_ai/search_character");
		expect(urls).not.toContain("/instagram/get_media");
		expect(urls).not.toContain("/remini/create_task");
	});

	it("refuses the same route twice, letting Fastify enforce it", async () => {
		const app = Fastify();

		await expect(
			(async () => {
				await app.register(tiktokRoutes, { prefix: "/shared" });
				await app.register(tiktokRoutes, { prefix: "/shared" });
				await app.ready();
			})()
		).rejects.toThrow(/already declared/);

		await app.close();
	});

	it("declares the audio format header only when the app asks for it", async () => {
		const without = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
			});
		});
		const declared = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
				declareAudioResponseHeader: true,
			});
		});

		for (const url of [
			"/audio/music_compose",
			"/audio/speech_to_speech",
			"/audio/text_to_dialogue",
			"/audio/text_to_speech",
		]) {
			expect(find(without, url).schema.headers).toBeUndefined();
			expect(find(declared, url).schema.headers).toBeDefined();
		}

		for (const url of [
			"/audio/create_clone_voice",
			"/audio/get_models",
			"/audio/get_voices",
			"/audio/music_compose_plan",
			"/audio/text_to_speech/with_timestamp",
			"/audio/voices/:voice_id",
		]) {
			expect(find(without, url).schema.headers).toBeUndefined();
			expect(find(declared, url).schema.headers).toBeUndefined();
		}
	});

	it("publishes the consumes of a route from its definition", async () => {
		const routes = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
			});
		});

		expect(
			find(routes, "/audio/create_clone_voice").schema.consumes
		).toEqual(["multipart/form-data"]);
		expect(find(routes, "/audio/music_compose").schema.consumes).toEqual([
			"application/json",
		]);
		expect(find(routes, "/audio/speech_to_speech").schema.consumes).toEqual(
			["application/json", "multipart/form-data"]
		);
	});

	it("publishes the description of a route from its definition", async () => {
		const routes = await capture(async (app) => {
			await app.register(audioRoutes, {
				prefix: AUDIO_ROUTE_PREFIX,
				...AUDIO_OPTIONS,
			});
		});

		expect(
			find(routes, "/audio/text_to_dialogue").schema.description
		).toContain("text_to_dialogue-output.wav");
		expect(find(routes, "/audio/get_models").schema.description).toBe(
			"Get available models"
		);
	});

	it("publishes the mtxx examples without an app override", async () => {
		const routes = await capture(async (app) => {
			await app.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
		});

		expect(
			find(routes, "/mtxx/clothes_segmentation").schema.description
		).toContain("Segmentation Mask");
		expect(
			find(routes, "/mtxx/expression_generation").schema.description
		).toContain("Smile mode 0");
		expect(find(routes, "/mtxx/outpainting").schema.description).toContain(
			"120% of original"
		);
		expect(
			find(routes, "/mtxx/versatile_hairstyle").schema.description
		).toContain("Hair types");
	});
});
