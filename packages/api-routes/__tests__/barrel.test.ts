import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { apiErrorHandler, ROUTE_MODULE_PREFIXES } from "../src";
import { INSTAGRAM_ROUTE_PREFIX, instagramRoutes } from "../src/instagram";

describe("the package entry point", () => {
	it("holds the namespace registry and no feature client", () => {
		expect(ROUTE_MODULE_PREFIXES).toEqual({
			audio: "/audio",
			"character-ai": "/character_ai",
			instagram: "/instagram",
			mtxx: "/mtxx",
			pixverse: "/pixverse",
			remini: "/remini",
			tiktok: "/tiktok",
		});
	});

	it("registers a module directly with the prefix of the app", async () => {
		const urls: string[] = [];
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

		app.addHook("onRoute", (routeOptions) => {
			urls.push(routeOptions.url);
		});

		await app.register(instagramRoutes, {
			prefix: INSTAGRAM_ROUTE_PREFIX,
		});
		await app.ready();

		expect(urls).toContain("/instagram/get_media");
		await app.close();
	});

	it("answers with the failure envelope when it is asked for", async () => {
		const app = Fastify();

		await app.register(apiErrorHandler, {});
		const response = await app.inject({ method: "GET", url: "/nowhere" });

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			ok: false,
			errors: { type: "NOT_FOUND" },
		});
		await app.close();
	});
});
