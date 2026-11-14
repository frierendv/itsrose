import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import {
	apiErrorHandler,
	claimRoutePrefix,
	joinUrl,
	registerRouteModule,
	resolvePrefix,
} from "../src";
import { instagramRoutes } from "../src/instagram";

describe("the package entry point", () => {
	it("holds nothing but the pieces every application needs", () => {
		expect(resolvePrefix(undefined, "/audio")).toBe("/audio");
		expect(joinUrl("/audio", "/text_to_speech")).toBe(
			"/audio/text_to_speech"
		);
	});

	it("registers a module through the shared helper", async () => {
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

		await registerRouteModule(app, instagramRoutes, {});
		await app.ready();

		expect(urls).toContain("/instagram/get_media");
		await app.close();
	});

	it("claims a prefix per application", async () => {
		const app: FastifyInstance = Fastify();

		expect(claimRoutePrefix(app, "/audio", "audio")).toBe("/audio");
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
