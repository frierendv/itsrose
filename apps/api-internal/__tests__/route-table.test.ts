import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { registerApiRouteModules } from "../src/lib/route-modules";

/**
 * The internal route table: `/{module}/{route}`, unversioned.
 *
 * This is the surface the internal facade serves (19 routes). It is written
 * out here, independently of the application's table, so that a wiring change
 * cannot move a facade URL unnoticed.
 */
const INTERNAL_ROUTES = [
	"GET /audio/get_models",
	"GET /audio/get_voices",
	"GET /instagram/get_media",
	"GET /mtxx/get_task",
	"GET /tiktok/get_content",
	"POST /audio/create_clone_voice",
	"POST /audio/music_compose",
	"POST /audio/music_compose_plan",
	"POST /audio/speech_to_speech",
	"POST /audio/text_to_dialogue",
	"POST /audio/text_to_speech",
	"POST /audio/text_to_speech/with_timestamp",
	"POST /mtxx/clothes_segmentation",
	"POST /mtxx/expression_generation",
	"POST /mtxx/image_restoration",
	"POST /mtxx/outpainting",
	"POST /mtxx/remove_bg",
	"POST /mtxx/versatile_hairstyle",
	"POST /remini/create_task",
];

/**
 * Returns the path of a captured `METHOD /path` entry.
 */
const pathOf = (route: string): string => route.split(" ")[1] ?? "";

describe("the internal route table", () => {
	it("serves the whole unversioned facade surface and nothing else", async () => {
		const urls: string[] = [];
		const app = Fastify();

		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(
			createSerializerCompiler({
				stringify: (value: unknown) => JSON.stringify(value),
			})
		);

		app.addHook("onRoute", (routeOptions) => {
			// Fastify derives a HEAD route from every GET route; the table
			// above lists the routes the app declares.
			if (routeOptions.method === "HEAD") {
				return;
			}

			const method = Array.isArray(routeOptions.method)
				? routeOptions.method.join(",")
				: String(routeOptions.method);
			urls.push(`${method} ${routeOptions.url}`);
		});

		await registerApiRouteModules(app);
		await app.ready();
		await app.close();

		expect(urls).toHaveLength(INTERNAL_ROUTES.length);
		expect([...urls].sort()).toEqual([...INTERNAL_ROUTES].sort());

		// The facade stays unversioned by decision: its URLs are JojApi's,
		// not a version of the public surface (public-route-surface.md, D6).
		const paths = urls.map(pathOf);
		expect(paths.filter((path) => path.startsWith("/v1/"))).toEqual([]);

		// The internal API does not serve character.ai, so no client of that
		// package - and none of its credentials - is ever loaded here.
		expect(paths.filter((path) => path.includes("character_ai"))).toEqual(
			[]
		);
	});
});
