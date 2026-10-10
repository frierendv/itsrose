import { textToDialogue, textToDialogueSchema } from "@itsrose/elevenlabs";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/text_to_dialogue",
		schema: {
			tags: ["Audio"],
			summary: "Text to Dialogue",
			description: "Convert text to dialogue.",
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
