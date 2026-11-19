import { PIXVERSE_ENV_KEYS } from "@itsrose/pixverse/env";
import { ROUTE_MODULE_PREFIXES } from "../options";

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
 * The URL namespace of the pixverse routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const PIXVERSE_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["pixverse"];
