import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

/**
 * Every route of the tiktok surface, keyed by the route it belongs to.
 */
export const TIKTOK_ROUTE_KEYS = ["getContent"] as const;

/**
 * The key of a route of the tiktok surface.
 */
export type TiktokRouteKey = (typeof TIKTOK_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the tiktok routes.
 */
export const TIKTOK_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["tiktok"];

/**
 * The options the tiktok route module is registered with.
 */
export type TiktokRoutesOptions = RouteModuleOptions<TiktokRouteKey>;
