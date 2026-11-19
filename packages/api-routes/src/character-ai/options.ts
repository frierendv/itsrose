import { CHARACTER_AI_ENV_KEYS } from "@itsrose/character-ai/env";
import { ROUTE_MODULE_PREFIXES } from "../options";

/**
 * A environment variable needed by this route.
 */
export { CHARACTER_AI_ENV_KEYS };
/**
 * Every route of the character.ai surface, keyed by the route it belongs to.
 */
export const CHARACTER_AI_ROUTE_KEYS = [
	"characterInfo",
	"searchCharacter",
	"sendMessage",
] as const;

/**
 * The key of a route of the character.ai surface.
 */
export type CharacterAiRouteKey = (typeof CHARACTER_AI_ROUTE_KEYS)[number];

/**
 * The URL namespace of the character.ai routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const CHARACTER_AI_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["character-ai"];
