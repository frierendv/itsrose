import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { API_VERSION, registerVersionedRoutes } from "../src/lib/routes";

/**
 * The public route table: `/{version}/{module}/{route}`.
 *
 * This is the table from `plan-api-routes-refactor-v2.md` §3.1 (25 routes).
 * It is written out here, independently of the application's table, so that a
 * wiring change cannot move a public URL unnoticed.
 */
const PUBLIC_ROUTES = [
	"POST /v1/audio/create_clone_voice",
	"GET /v1/audio/get_models",
	"GET /v1/audio/get_voices",
	"POST /v1/audio/music_compose",
	"POST /v1/audio/music_compose_plan",
	"POST /v1/audio/speech_to_speech",
	"POST /v1/audio/text_to_dialogue",
	"POST /v1/audio/text_to_speech",
	"POST /v1/audio/text_to_speech/with_timestamp",
	"GET /v1/character_ai/search_character",
	"POST /v1/character_ai/send_message",
	"GET /v1/character_ai/character_info",
	"GET /v1/instagram/get_media",
	"POST /v1/mtxx/clothes_segmentation",
	"POST /v1/mtxx/expression_generation",
	"POST /v1/mtxx/image_restoration",
	"POST /v1/mtxx/outpainting",
	"POST /v1/mtxx/remove_bg",
	"POST /v1/mtxx/versatile_hairstyle",
	"GET /v1/mtxx/get_task",
	"POST /v1/pixverse/text_to_video",
	"POST /v1/pixverse/image_to_video",
	"GET /v1/pixverse/get_task",
	"POST /v1/remini/create_task",
	"GET /v1/tiktok/get_content",
];

describe("the public route table", () => {
	it("serves the whole public surface at /v1/<module> and nothing else", async () => {
		expect(API_VERSION).toBe("/v1");

		const urls: string[] = [];
		const app = Fastify();

		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(
			createSerializerCompiler({
				stringify: (value: unknown) => JSON.stringify(value),
			})
		);

		app.addHook("onRoute", (routeOptions) => {
			if (routeOptions.method === "HEAD") {
				return;
			}

			const method = Array.isArray(routeOptions.method)
				? routeOptions.method.join(",")
				: String(routeOptions.method);
			urls.push(`${method} ${routeOptions.url}`);
		});

		await registerVersionedRoutes(app);
		await app.ready();
		await app.close();

		expect(urls).toHaveLength(PUBLIC_ROUTES.length);
		expect([...urls].sort()).toEqual([...PUBLIC_ROUTES].sort());

		// Regression for 15eaa26: autoload used to prepend the folder prefix,
		// so the app served `/audio/v1/...` instead of `/v1/audio/...`.
		expect(urls.filter((url) => url.includes("/audio/v1/"))).toEqual([]);
		expect(
			urls.filter((url) => !url.split(" ")[1]?.startsWith("/v1/"))
		).toEqual([]);
	});
});
