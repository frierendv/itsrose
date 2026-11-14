import {
	ElevenLabsSharedResponseAudioSchema,
	speechToSpeech,
	speechToSpeechSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { uploadAudio, uploadWhenUrlRequested } from "../../audio";
import type { SharedRoutesOptions } from "../../options";
import { withAudioResponseHeader } from "../../schema";

const DESCRIPTION = "Convert speech to speech";

/**
 * Registers `POST /speech_to_speech`.
 */
export const registerSpeechToSpeechRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/speech_to_speech",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Speech to Speech",
				description:
					options.descriptions?.speechToSpeech ?? DESCRIPTION,
				consumes: options.consumes?.speechToSpeech ?? [
					"application/json",
					"multipart/form-data",
				],
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
