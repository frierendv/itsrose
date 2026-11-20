import {
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
} from "@itsrose/api-routes/audio";
import { VoiceNotFoundError } from "@itsrose/auth-resources/voices";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import apiResponsePlugin from "../src/plugins/openapi/api-response";

/**
 * Builds an app that only carries the shared error handler and routes that
 * throw the voice errors.
 */
async function build(): Promise<FastifyInstance> {
	const app = Fastify();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	await app.register(apiResponsePlugin);

	app.get("/denied", async () => {
		throw new VoiceAccessDeniedError("voice-1");
	});
	app.get("/unavailable", async () => {
		throw new VoiceAccessUnavailableError();
	});
	app.get("/missing", async () => {
		throw new VoiceNotFoundError("voice-1");
	});

	await app.ready();
	return app;
}

describe("the voice error mapping", () => {
	it("answers 403 for a voice the caller may not use, without saying why", async () => {
		const app = await build();

		const response = await app.inject({ method: "GET", url: "/denied" });

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2201,
			errors: { voice_id: "voice-1" },
		});
		// A foreign voice and an unknown one raise the same error; the
		// response must stay a single message so the route is not an
		// existence oracle.
		expect(response.json().message).toBe(
			"The requested voice is not available to this caller."
		);

		await app.close();
	});

	it("answers 501 when the deployment did not compose the ownership port", async () => {
		const app = await build();

		const response = await app.inject({
			method: "GET",
			url: "/unavailable",
		});

		expect(response.statusCode).toBe(501);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 3003,
			errors: { voice_access: expect.any(String) as string },
		});

		await app.close();
	});

	it("answers 404 for a missing or foreign voice", async () => {
		const app = await build();

		const response = await app.inject({ method: "GET", url: "/missing" });

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2301,
			errors: { voice_id: "voice-1" },
		});

		await app.close();
	});
});
