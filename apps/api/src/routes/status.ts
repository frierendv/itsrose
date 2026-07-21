import type { FastifyPluginAsync } from "fastify";
import z from "zod/v4";

const status: FastifyPluginAsync = async (fastify): Promise<void> => {
	void fastify.route({
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
					meta: z.object({
						test: z.string().describe("A test metadata field"),
					}),
				}),
			},
		},
		handler: async () => {
			return {
				status: "ok",
				meta: {
					test: "This is a test metadata field",
				},
			};
		},
	});

	void fastify.route({
		method: "GET",
		url: "/status/error",
		schema: {
			tags: ["General"],
			description: "Check if the service is up and running",
		},
		handler: async () => {
			throw fastify.httpErrors.internalServerError(
				"This is a test error"
			);
		},
	});
};

export default status;
