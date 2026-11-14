import {
	ElevenLabsSharedResponseAudioSchema,
	textToSpeech,
	textToSpeechSchema,
	textToSpeechWithTiming,
	WithTimestampSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { uploadAudio, uploadWhenUrlRequested } from "../../audio";
import type { SharedRoutesOptions } from "../../options";
import { withAudioResponseHeader } from "../../schema";

const DESCRIPTION = "Convert text to speech";
const TIMING_DESCRIPTION =
	"Generate speech from text with precise character-level timing information for audio-text synchronization.";

/**
 * Registers `POST /text_to_speech` and `POST /text_to_speech/with_timestamp`.
 */
export const registerTextToSpeechRoutes = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Text to Speech",
				description: options.descriptions?.textToSpeech ?? DESCRIPTION,
				body: textToSpeechSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: textToSpeechSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
			const response = await textToSpeech(request.body);

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

	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech/with_timestamp",
		schema: {
			tags: ["Audio"],
			summary: "Text to Speech with timing",
			description:
				options.descriptions?.textToSpeechWithTiming ??
				TIMING_DESCRIPTION,
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
