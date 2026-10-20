import { getModels, getModelsSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_models",
		schema: {
			tags: ["Audio"],
			summary: "Get Models",
			description: "Get available models",
			response: {
				200: getModelsSchema.response,
			},
		},
		handler: async () => {
			const response = await getModels();
			return response;
		},
	});
};

export default route;
