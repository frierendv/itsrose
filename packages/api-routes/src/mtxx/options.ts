import { MTXX_ENV_KEYS } from "@itsrose/mtxx/env";
import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

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
 * The default URL namespace of the mtxx routes.
 */
export const MTXX_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["mtxx"];

/**
 * The options the mtxx route module is registered with.
 */
export type MtxxRoutesOptions = RouteModuleOptions<MtxxRouteKey>;
