import { REMINI_ENV_KEYS } from "@itsrose/remini/env";
import { ROUTE_MODULE_PREFIXES, type RouteModuleOptions } from "../options";

/**
 * A environment variable needed by this route.
 */
export { REMINI_ENV_KEYS };
/**
 * Every route of the remini surface, keyed by the route it belongs to.
 */
export const REMINI_ROUTE_KEYS = ["createTask"] as const;

/**
 * The key of a route of the remini surface.
 */
export type ReminiRouteKey = (typeof REMINI_ROUTE_KEYS)[number];

/**
 * The default URL namespace of the remini routes.
 */
export const REMINI_ROUTE_PREFIX = ROUTE_MODULE_PREFIXES["remini"];

/**
 * The options the remini route module is registered with.
 */
export type ReminiRoutesOptions = RouteModuleOptions<ReminiRouteKey>;
