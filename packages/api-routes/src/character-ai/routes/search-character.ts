import { searchCharacter, searchCharacterSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const DESCRIPTION =
	"Search for Character.AI characters by name or query keyword";

/**
 * Registers `GET /search_character`.
 */
export const registerSearchCharacterRoute = (
	fastify: FastifyInstance
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/search_character",
		schema: {
			tags: ["Character.ai"],
			summary: "Search Character",
			description: DESCRIPTION,
			querystring: searchCharacterSchema.request,
			response: {
				200: searchCharacterSchema.response,
			},
		},
		handler: async (request) => {
			const response = await searchCharacter(request.query);
			return response;
		},
	});
};
