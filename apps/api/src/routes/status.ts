import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import z from "zod/v4";

const status: FastifyPluginAsync = async (fastify): Promise<void> => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/status",
		schema: {
			tags: ["General"],
			description: "Check if the service is up and running",
			response: {
				200: z.object({
					status: z
						.string()
						.describe(
							"The status of the service, expected to be 'ok'"
						),
				}),
			},
		},
		handler: async () => {
			return { status: "ok" };
		},
	});
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/me",
		schema: {
			tags: ["General"],
			description: "Check if the service is up and running",
			response: {
				/**
				 * The API key and the subscription of the caller.
				 *
				 * Both are shaped by their own packages, so the response is a
				 * free-form map of unknown values here: the route hands the
				 * two values over untouched.
				 */
				200: z.record(z.string(), z.unknown()),
			},
		},
		handler: async (request) => {
			return {
				apikey: request.apikey,
				subscription: request.subscription,
			};
		},
	});
};

export default status;
