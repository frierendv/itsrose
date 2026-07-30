import { sendMessage, sendMessageSchema } from "@itsrose/character-ai";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: "/send_message",
		schema: {
			tags: ["Character.ai"],
			summary: "Send Message",
			description:
				"Send a message to a Character.AI character and receive a response",
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

export default route;
