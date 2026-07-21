import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { z } from "zod/v4";

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/hooks",
		schema: {
			tags: ["General"],
			description: "Receive a webhook from an external service",
			body: z.record(z.string(), z.any()).describe("Webhook payload"),
			response: {
				200: z.object({}).describe("Empty response"),
			},
		},
		handler: async (request) => {
			const payload = request.body;
			console.log("Received webhook payload:", payload);
			return {};
		},
	});
};
export default routes;
