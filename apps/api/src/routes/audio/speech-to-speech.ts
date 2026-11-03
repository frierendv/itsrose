import {
	ElevenLabsSharedResponseAudioSchema,
	speechToSpeech,
	speechToSpeechSchema,
} from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/speech_to_speech",
		schema: {
			tags: ["Audio"],
			summary: "Speech to Speech",
			description: "Convert speech to speech",
			consumes: ["application/json", "multipart/form-data"],
			body: speechToSpeechSchema.request,
			headers: ElevenLabsSharedResponseAudioSchema,
			response: {
				200: speechToSpeechSchema.response,
			},
		},
		handler: async (request) => {
			const { audio, ...options } = request.body;
			const audioFormat = request.headers["response-audio-format"];
			const response = await speechToSpeech(audio, options);

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
};

export default route;
