import {
	ElevenLabsSharedResponseAudioSchema,
	textToSpeech,
	textToSpeechSchema,
	textToSpeechWithTiming,
	WithTimestampSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { withAudioResponseHeader } from "../../schema";
import type { AudioRoutesOptions } from "../options";
import { uploadAudio, uploadWhenUrlRequested } from "../upload";
import { assertVoiceIdsAllowed } from "../voice-access";

const DESCRIPTION = "Convert text to speech";
const TIMING_DESCRIPTION =
	"Generate speech from text with precise character-level timing information for audio-text synchronization.";

/**
 * Registers `POST /text_to_speech` and `POST /text_to_speech/with_timestamp`.
 */
export const registerTextToSpeechRoutes = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_speech",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Text to Speech",
				description: DESCRIPTION,
				body: textToSpeechSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: textToSpeechSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
			// The ownership check runs before the upstream call, so a foreign
			// voice never spends a generation. Without the port it is a no-op.
			await assertVoiceIdsAllowed(options, request, [
				request.body.voice_id,
			]);

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
			description: TIMING_DESCRIPTION,
			body: textToSpeechSchema.request,
			response: {
				200: WithTimestampSchema.extend(
					textToSpeechSchema.response.shape
				),
			},
		},
		handler: async (request) => {
			// Same body as `/text_to_speech`, so the same ownership check.
			await assertVoiceIdsAllowed(options, request, [
				request.body.voice_id,
			]);

			return textToSpeechWithTiming(request.body);
		},
	});
};
