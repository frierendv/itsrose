import { TIKTOK_ENV_KEYS } from "@itsrose/tiktok/env";
import { ROUTE_MODULE_PREFIXES } from "../options";

/**
 * A environment variable needed by this route.
 */
export { TIKTOK_ENV_KEYS };
/**
 * Every route of the tiktok surface, keyed by the route it belongs to.
 */
export const TIKTOK_ROUTE_KEYS = ["getContent"] as const;

/**
 * The key of a route of the tiktok surface.
 */
export type TiktokRouteKey = (typeof TIKTOK_ROUTE_KEYS)[number];

/**
 * The URL namespace of the tiktok routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const TIKTOK_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["tiktok"];
