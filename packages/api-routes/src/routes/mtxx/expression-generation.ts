import {
	expressionGeneration,
	expressionGenerationSchema,
} from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION =
	"This interface is used to process requests generated for smile expressions in the cloud.";

/**
 * Registers `POST /expression_generation`.
 */
export const registerExpressionGenerationRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/expression_generation",
		schema: {
			tags: ["Mtxx"],
			summary: "Expression Generation",
			description:
				options.descriptions?.expressionGeneration ?? DESCRIPTION,
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
