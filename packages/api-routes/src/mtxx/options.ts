import { MTXX_ENV_KEYS } from "@itsrose/mtxx/env";
import { ROUTE_MODULE_PREFIXES } from "../options";

/**
 * A environment variable needed by this route.
 */
export { MTXX_ENV_KEYS };
/**
 * Every route of the mtxx surface, keyed by the route it belongs to.
 */
export const MTXX_ROUTE_KEYS = [
	"clothesSegmentation",
	"expressionGeneration",
	"imageRestoration",
	"outpainting",
	"removeBg",
	"versatileHairstyle",
	"getTask",
] as const;

/**
 * The key of a route of the mtxx surface.
 */
export type MtxxRouteKey = (typeof MTXX_ROUTE_KEYS)[number];

/**
 * The URL namespace of the mtxx routes.
 *
 * The module itself does not read it: the mounting application registers the
 * module under this prefix.
 */
export const MTXX_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["mtxx"];
