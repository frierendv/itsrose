import { getModels, getModelsSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION = "Get available models";

/**
 * Registers `GET /get_models`.
 */
export const registerGetModelsRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_models",
		schema: {
			tags: ["Audio"],
			summary: "Get Models",
			description: options.descriptions?.getModels ?? DESCRIPTION,
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
