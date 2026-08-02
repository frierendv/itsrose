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
};

export default status;
