import { getVoices, getVoicesSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/get_voices",
		schema: {
			tags: ["ElevenLabs"],
			summary: "Get Voices",
			description: "Get available voices from ElevenLabs API",
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

export default route;
