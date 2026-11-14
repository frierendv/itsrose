import { searchCharacter, searchCharacterSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { CharacterAiRoutesOptions } from "../options";

const DESCRIPTION =
	"Search for Character.AI characters by name or query keyword";

/**
 * Registers `GET /search_character` under the prefix of the module.
 */
export const registerSearchCharacterRoute = (
	fastify: FastifyInstance,
	options: CharacterAiRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/search_character"),
		schema: {
			tags: ["Character.ai"],
			summary: "Search Character",
			description: options.descriptions?.searchCharacter ?? DESCRIPTION,
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
