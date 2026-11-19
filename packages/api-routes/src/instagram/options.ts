import { ROUTE_MODULE_PREFIXES } from "../options";

/**
 * A environment variable needed by this route.
 */
export const INSTAGRAM_ENV_KEYS = [] as const;
/**
 * Every route of the instagram surface, keyed by the route it belongs to.
 */
export const INSTAGRAM_ROUTE_KEYS = ["getMedia"] as const;

/**
 * The key of a route of the instagram surface.
 */
export type InstagramRouteKey = (typeof INSTAGRAM_ROUTE_KEYS)[number];

/**
 * The URL namespace of the instagram routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const INSTAGRAM_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["instagram"];
