import {
	ElevenLabsSharedResponseAudioSchema,
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
			headers: ElevenLabsSharedResponseAudioSchema,
			response: {
				200: textToSpeechSchema.response,
			},
		},
		handler: async (request) => {
			const response = await textToSpeech(request.body);
			const audioFormat = request.headers["response-audio-format"];

			if (audioFormat === "url") {
				response.audio = await fastify.s3.uploadUserFile(
					request,
					response.audio,
					{ preprocess: (data) => Buffer.from(data, "base64") }
				);
			}

			return response;
		},
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
