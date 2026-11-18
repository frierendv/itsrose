import { PIXVERSE_ENV_KEYS } from "@itsrose/pixverse/env";
import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

/**
 * A environment variable needed by this route.
 */
export { PIXVERSE_ENV_KEYS };

/**
 * Every route of the pixverse surface, keyed by the route it belongs to.
 */
export const PIXVERSE_ROUTE_KEYS = [
	"textToVideo",
	"imageToVideo",
	"getTask",
] as const;

/**
 * The key of a route of the pixverse surface.
 */
export type PixverseRouteKey = (typeof PIXVERSE_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the pixverse routes.
 */
export const PIXVERSE_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["pixverse"];

/**
 * The options the pixverse route module is registered with.
 */
export type PixverseRoutesOptions = RouteModuleOptions<PixverseRouteKey>;
