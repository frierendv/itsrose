import {
	textToSpeech,
	textToSpeechSchema,
	textToSpeechWithTiming,
	WithTimestampSchema,
} from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech",
		schema: {
			tags: ["Audio"],
			summary: "Text to Speech",
			description: "Convert text to speech",
			body: textToSpeechSchema.request,
			response: {
				200: textToSpeechSchema.response,
			},
		},
		handler: async (request) => textToSpeech(request.body),
	});

	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech/with_timestamp",
		schema: {
			tags: ["Audio"],
			summary: "Text to Speech with timing",
			description:
				"Generate speech from text with precise character-level timing information for audio-text synchronization.",
			body: textToSpeechSchema.request,
			response: {
				200: WithTimestampSchema.extend(
					textToSpeechSchema.response.shape
				),
			},
		},
		handler: async (request) => textToSpeechWithTiming(request.body),
	});
};

export default route;
