import { getVoices, getVoicesSchema } from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION = "Get available voices";

/**
 * Registers `GET /get_voices`.
 */
export const registerGetVoicesRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_voices",
		schema: {
			tags: ["Audio"],
			summary: "Get Voices",
			description: DESCRIPTION,
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
