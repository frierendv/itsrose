import { searchCharacter, searchCharacterSchema } from "@itsrose/character-ai";
import type { FastifyPluginAsync } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";

const route: FastifyPluginAsync = async (fastify): Promise<void> => {
	fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: "/search_character",
		schema: {
			tags: ["Character.ai"],
			summary: "Search Character",
			description:
				"Search for Character.AI characters by name or query keyword",
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

export default route;
