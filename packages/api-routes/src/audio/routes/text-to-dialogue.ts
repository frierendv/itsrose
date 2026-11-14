import {
	ElevenLabsSharedResponseAudioSchema,
	textToDialogue,
	textToDialogueSchema,
} from "@itsrose/elevenlabs";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import { withAudioResponseHeader } from "../../schema";
import type { AudioRoutesOptions } from "../options";
import { uploadAudio, uploadWhenUrlRequested } from "../upload";

const DESCRIPTION = "Convert text to dialogue.";

/**
 * Registers `POST /text_to_dialogue` under the prefix of the module.
 */
export const registerTextToDialogueRoute = (
	fastify: FastifyInstance,
	options: AudioRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/text_to_dialogue"),
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
