import {
	ElevenLabsSharedResponseAudioSchema,
	speechToSpeech,
	speechToSpeechSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { withAudioResponseHeader } from "../../schema";
import type { AudioRoutesOptions } from "../options";
import { uploadAudio, uploadWhenUrlRequested } from "../upload";

const DESCRIPTION = "Convert speech to speech";

/**
 * Registers `POST /speech_to_speech`.
 */
export const registerSpeechToSpeechRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/speech_to_speech",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Speech to Speech",
				description: DESCRIPTION,
				consumes: ["application/json", "multipart/form-data"],
				body: speechToSpeechSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: speechToSpeechSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
			const { audio, ...speechOptions } = request.body;
			const response = await speechToSpeech(audio, speechOptions);

			response.audio = await uploadAudio(
				request,
				response.audio,
				request.headers["response-audio-format"],
				uploadWhenUrlRequested,
				options
			);

			return response;
		},
	});
};
