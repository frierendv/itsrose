import { sendMessage, sendMessageSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION =
	"Send a message to a Character.AI character and receive a response";

/**
 * Registers `POST /send_message`.
 */
export const registerSendMessageRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/send_message",
		schema: {
			tags: ["Character.ai"],
			summary: "Send Message",
			description: DESCRIPTION,
			body: sendMessageSchema.request,
			response: {
				200: sendMessageSchema.response,
			},
		},
		handler: async (request) => {
			const response = await sendMessage(request.body);
			return response;
		},
	});
};
