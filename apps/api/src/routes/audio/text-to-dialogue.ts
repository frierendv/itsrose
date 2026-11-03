import {
	ElevenLabsSharedResponseAudioSchema,
	textToDialogue,
	textToDialogueSchema,
} from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_dialogue",
		schema: {
			tags: ["Audio"],
			summary: "Text to Dialogue",
			description: `Convert text to dialogue.

Example Output:

- [English](https://assets.itsrose.net/public-resource/text_to_dialogue-output.wav) Three people talking
- [Indonesian](https://assets.itsrose.net/public-resource/text_to_dialogue-output-ID.wav) Two people talking
`,
			body: textToDialogueSchema.request,
			headers: ElevenLabsSharedResponseAudioSchema,
			response: {
				200: textToDialogueSchema.response,
			},
		},
		handler: async (request) => {
			const audioFormat = request.headers["response-audio-format"];
			const response = await textToDialogue(request.body);
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
