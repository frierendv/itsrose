import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

/**
 * Every route of the instagram surface, keyed by the route it belongs to.
 */
export const INSTAGRAM_ROUTE_KEYS = ["getMedia"] as const;

/**
 * The key of a route of the instagram surface.
 */
export type InstagramRouteKey = (typeof INSTAGRAM_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the instagram routes.
 */
export const INSTAGRAM_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["instagram"];

/**
 * The options the instagram route module is registered with.
 */
export type InstagramRoutesOptions = RouteModuleOptions<InstagramRouteKey>;
