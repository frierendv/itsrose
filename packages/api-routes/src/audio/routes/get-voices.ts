import { getVoices, getVoicesSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { AudioRoutesOptions } from "../options";

const DESCRIPTION = "Get available voices";

/**
 * Registers `GET /get_voices` under the prefix of the module.
 */
export const registerGetVoicesRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/get_voices"),
		schema: {
			tags: ["Audio"],
			summary: "Get Voices",
			description: options.descriptions?.getVoices ?? DESCRIPTION,
			querystring: getVoicesSchema.request,
			response: {
				200: getVoicesSchema.response,
			},
		},
		handler: async (request) => {
			const response = await getVoices(request.query);
			return response;
		},
	});
};
