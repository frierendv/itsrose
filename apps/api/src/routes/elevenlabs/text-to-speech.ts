import { textToSpeech, textToSpeechSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech",
		schema: {
			tags: ["ElevenLabs"],
			summary: "Text to Speech",
			description: "Convert text to speech using ElevenLabs API",
			body: textToSpeechSchema.request,
			response: {
				200: textToSpeechSchema.response,
			},
		},
		handler: async (request) => {
			const response = await textToSpeech(request.body);
			return response;
		},
	});
};

export default route;
