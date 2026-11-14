import { sendMessage, sendMessageSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { CharacterAiRoutesOptions } from "../options";

const DESCRIPTION =
	"Send a message to a Character.AI character and receive a response";

/**
 * Registers `POST /send_message` under the prefix of the module.
 */
export const registerSendMessageRoute = (
	fastify: FastifyInstance,
	options: CharacterAiRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "POST",
		url: joinUrl(prefix, "/send_message"),
		schema: {
			tags: ["Character.ai"],
			summary: "Send Message",
			description: options.descriptions?.sendMessage ?? DESCRIPTION,
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
