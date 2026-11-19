import { characterInfo, characterInfoSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION =
	"Retrieve Character.AI character information by external ID";

/**
 * Registers `GET /character_info`.
 */
export const registerCharacterInfoRoute = (fastify: FastifyInstance): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/character_info",
		schema: {
			tags: ["Character.ai"],
			summary: "Character information",
			description: DESCRIPTION,
			querystring: characterInfoSchema.request,
			response: {
				200: characterInfoSchema.response,
			},
		},
		handler: async (request) => characterInfo(request.query),
	});
};
