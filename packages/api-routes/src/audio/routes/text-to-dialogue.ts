import {
	ElevenLabsSharedResponseAudioSchema,
	textToDialogue,
	textToDialogueSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { withAudioResponseHeader } from "../../schema";
import type { AudioRoutesOptions } from "../options";
import { uploadAudio, uploadWhenUrlRequested } from "../upload";
import { assertVoiceIdsAllowed } from "../voice-access";

const DESCRIPTION = `Convert text to dialogue.

Example Output:

- [English](https://assets.itsrose.net/public-resource/text_to_dialogue-output.wav) Three people talking
- [Indonesian](https://assets.itsrose.net/public-resource/text_to_dialogue-output-ID.wav) Two people talking
`;

/**
 * Registers `POST /text_to_dialogue`.
 */
export const registerTextToDialogueRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_dialogue",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Text to Dialogue",
				description: DESCRIPTION,
				body: textToDialogueSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: textToDialogueSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
			// Every input names its own voice: an unowned one anywhere in the
			// dialogue refuses the whole request before the upstream call.
			await assertVoiceIdsAllowed(
				options,
				request,
				request.body.inputs.map((input) => input.voice_id)
			);

			const response = await textToDialogue(request.body);
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
