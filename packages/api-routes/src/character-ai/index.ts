import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerCharacterInfoRoute } from "./routes/character-info";
import { registerSearchCharacterRoute } from "./routes/search-character";
import { registerSendMessageRoute } from "./routes/send-message";

/**
 * The character.ai routes of the shared surface.
 *
 * The routes are relative: they live under whatever prefix the mounting
 * application registers the module with. The module is opt-in: it loads the
 * character.ai client, which reads its credentials from the environment when
 * it is imported. An application that does not serve character.ai does not
 * register this module and therefore never needs those credentials.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const characterAiRoutes: FastifyPluginAsync = async (
	fastify: FastifyInstance
): Promise<void> => {
	registerSearchCharacterRoute(fastify);
	registerSendMessageRoute(fastify);
	registerCharacterInfoRoute(fastify);
};

export { CHARACTER_AI_ROUTE_KEYS, CHARACTER_AI_ROUTE_PREFIX } from "./options";
export type { CharacterAiRouteKey } from "./options";
