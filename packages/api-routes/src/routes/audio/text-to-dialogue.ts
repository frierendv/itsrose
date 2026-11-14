import {
	ElevenLabsSharedResponseAudioSchema,
	textToDialogue,
	textToDialogueSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { uploadAudio, uploadWhenUrlRequested } from "../../audio";
import type { SharedRoutesOptions } from "../../options";
import { withAudioResponseHeader } from "../../schema";

const DESCRIPTION = "Convert text to dialogue.";

/**
 * Registers `POST /text_to_dialogue`.
 */
export const registerTextToDialogueRoute = (
	fastify: FastifyInstance,
	options: SharedRoutesOptions
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_dialogue",
		schema: withAudioResponseHeader(
			{
				tags: ["Audio"],
				summary: "Text to Dialogue",
				description:
					options.descriptions?.textToDialogue ?? DESCRIPTION,
				body: textToDialogueSchema.request,
				headers: ElevenLabsSharedResponseAudioSchema,
				response: {
					200: textToDialogueSchema.response,
				},
			},
			options.declareAudioResponseHeader
		),
		handler: async (request) => {
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
