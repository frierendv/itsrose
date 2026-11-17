import { CHARACTER_AI_ENV_KEYS } from "@itsrose/character-ai/env";
import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

/**
 * A environment variable needed by this route.
 */
export { CHARACTER_AI_ENV_KEYS };
/**
 * Every route of the character.ai surface, keyed by the route it belongs to.
 */
export const CHARACTER_AI_ROUTE_KEYS = [
	"searchCharacter",
	"sendMessage",
] as const;

/**
 * The key of a route of the character.ai surface.
 */
export type CharacterAiRouteKey = (typeof CHARACTER_AI_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the character.ai routes.
 */
export const CHARACTER_AI_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["character-ai"];

/**
 * The options the character.ai route module is registered with.
 */
export type CharacterAiRoutesOptions = RouteModuleOptions<CharacterAiRouteKey>;
