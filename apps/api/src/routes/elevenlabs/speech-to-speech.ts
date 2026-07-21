import { speechToSpeech, speechToSpeechSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/speech_to_speech",
		schema: {
			tags: ["ElevenLabs"],
			summary: "Speech to Speech",
			description: "Convert speech to speech using ElevenLabs API",
			consumes: ["application/json", "multipart/form-data"],
			body: speechToSpeechSchema.request,
			response: {
				200: speechToSpeechSchema.response,
			},
		},
		handler: async (request) => {
			const { audio, ...options } = request.body;

			const response = await speechToSpeech(audio, options);
			return response;
		},
	});
};

export default route;
