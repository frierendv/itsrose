import {
	expressionGeneration,
	expressionGenerationSchema,
} from "@itsrose/mtxx";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/expression_generation",
		schema: {
			tags: ["Mtxx"],
			summary: "Expression Generation",
			description:
				"This interface is used to process requests generated for smile expressions in the cloud.",
			body: expressionGenerationSchema.request,
			response: {
				200: expressionGenerationSchema.response,
			},
		},
		handler: async (request) => {
			const response = await expressionGeneration(request.body);
			return response;
		},
	});
};

export default route;
