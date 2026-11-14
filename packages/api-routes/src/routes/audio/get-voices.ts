import { getVoices, getVoicesSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import type { SharedRoutesOptions } from "../../options";

const DESCRIPTION = "Get available voices";

/**
 * Registers `GET /get_voices`.
 */
export const registerGetVoicesRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_voices",
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
