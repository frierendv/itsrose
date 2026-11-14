import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import hooks from "../src/routes/hooks";
import status from "../src/routes/status";

const API_KEY = { id: "key-1", name: "test key", enabled: true };
const SUBSCRIPTION = { has_access: true, plan: { plan_id: "pro" } };

async function buildServer(): Promise<FastifyInstance> {
	const fastify = Fastify();

	fastify.setValidatorCompiler(validatorCompiler);
	fastify.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	fastify.decorateRequest("apikey", null);
	fastify.decorateRequest("subscription", null);
	fastify.addHook("onRequest", async (request) => {
		request.apikey = API_KEY;
		request.subscription = SUBSCRIPTION;
	});

	await fastify.register(hooks);
	await fastify.register(status);

	return fastify;
}

describe("POST /hooks", () => {
	it("accepts a webhook payload of any shape", async () => {
		const fastify = await buildServer();

		const response = await fastify.inject({
			method: "POST",
			url: "/hooks",
			payload: {
				event: "invoice.paid",
				count: 3,
				items: [{ id: "a" }],
				metadata: { nested: { deep: true } },
			},
		});

		expect(response.statusCode).toBe(200);
	});

	it("rejects a body that is not a payload object", async () => {
		const fastify = await buildServer();

		const response = await fastify.inject({
			method: "POST",
			url: "/hooks",
			payload: ["not", "a", "payload"],
		});

		expect(response.statusCode).toBe(400);
	});
});

describe("GET /me", () => {
	it("answers with the API key and the subscription of the caller", async () => {
		const fastify = await buildServer();

		const response = await fastify.inject({
			method: "GET",
			url: "/me",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			apikey: API_KEY,
			subscription: SUBSCRIPTION,
		});
	});
});
