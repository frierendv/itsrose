import { getModels, getModelsSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { AudioRoutesOptions } from "../options";

const DESCRIPTION = "Get available models";

/**
 * Registers `GET /get_models` under the prefix of the module.
 */
export const registerGetModelsRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/get_models"),
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
