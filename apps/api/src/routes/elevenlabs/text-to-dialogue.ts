import { textToDialogue, textToDialogueSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_dialogue",
		schema: {
			tags: ["ElevenLabs"],
			summary: "Text to Dialogue",
			description: `Convert text to dialogue using ElevenLabs API

Example Output:

- [English](https://assets.itsrose.net/public-resource/text_to_dialogue-output.wav) Three people talking
- [Indonesian](https://assets.itsrose.net/public-resource/text_to_dialogue-output-ID.wav) Two people talking
`,
			body: textToDialogueSchema.request,
			response: {
				200: textToDialogueSchema.response,
			},
		},
		handler: async (request) => {
			const response = await textToDialogue(request.body);
			return response;
		},
	});
};

export default route;
