import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { claimRoutePrefix, resolvePrefix } from "../prefix";
import {
	CHARACTER_AI_ROUTE_PREFIX,
	type CharacterAiRoutesOptions,
} from "./options";
import { registerCharacterInfoRoute } from "./routes/character-info";
import { registerSearchCharacterRoute } from "./routes/search-character";
import { registerSendMessageRoute } from "./routes/send-message";

/**
 * The character.ai routes of the shared surface.
 *
 * The module is opt-in: it loads the character.ai client, which reads its
 * credentials from the environment when it is imported. An application that
 * does not serve character.ai does not register this module and therefore
 * never needs those credentials.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @param options - The options of the application.
 */
export const characterAiRoutes: FastifyPluginAsync<CharacterAiRoutesOptions> =
	fp(
		async (
			fastify: FastifyInstance,
			options: CharacterAiRoutesOptions
		): Promise<void> => {
			const prefix = claimRoutePrefix(
				fastify,
				resolvePrefix(options.prefix, CHARACTER_AI_ROUTE_PREFIX),
				"character-ai"
			);

			registerSearchCharacterRoute(fastify, options, prefix);
			registerSendMessageRoute(fastify, options, prefix);
			registerCharacterInfoRoute(fastify, options, prefix);
		},
		{ name: "api-routes-character-ai" }
	);

export { CHARACTER_AI_ROUTE_KEYS, CHARACTER_AI_ROUTE_PREFIX } from "./options";
export type { CharacterAiRouteKey, CharacterAiRoutesOptions } from "./options";
