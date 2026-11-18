import { characterInfo, characterInfoSchema } from "@itsrose/character-ai";
import type { FastifyInstance } from "fastify";
import type { FastifyZodOpenApiTypeProvider } from "fastify-zod-openapi";
import { joinUrl, type RoutePrefix } from "../../prefix";
import type { CharacterAiRoutesOptions } from "../options";

const DESCRIPTION =
	"Retrieve Character.AI character information by external ID";

/**
 * Registers `GET /character_info` under the prefix of the module.
 */
export const registerCharacterInfoRoute = (
	fastify: FastifyInstance,
	options: CharacterAiRoutesOptions,
	prefix: RoutePrefix
): void => {
	void fastify.withTypeProvider<FastifyZodOpenApiTypeProvider>().route({
		method: "GET",
		url: joinUrl(prefix, "/character_info"),
		schema: {
			tags: ["Character.ai"],
			summary: "Character information",
			description: options.descriptions?.characterInfo ?? DESCRIPTION,
			querystring: characterInfoSchema.request,
			response: {
				200: characterInfoSchema.response,
			},
		},
		handler: async (request) => characterInfo(request.query),
	});
};
