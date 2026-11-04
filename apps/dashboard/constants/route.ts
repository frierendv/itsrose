import { viewPaths } from "@better-auth-ui/core";

/**
 * Partial auth route
 */
export const AUTH_ROUTES = Object.values(viewPaths.auth).map(
	(route) => `/${route}`
);
