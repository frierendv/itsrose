import { viewPaths } from "@better-auth-ui/core";

/**
 * Auth view segments that only make sense for guests. A signed-in visitor is
 * redirected away from these; every other auth view (sign-out, callback,
 * verify-email, error, redirect) must stay reachable while authenticated.
 */
const GUEST_ONLY_AUTH_VIEWS = [
	"signIn",
	"signUp",
	"forgotPassword",
	"resetPassword",
	"resetLinkSent",
] as const;

/**
 * Every auth view path exposed by `@better-auth-ui/core`.
 */
export const AUTH_ROUTES = Object.values(viewPaths.auth).map(
	(route) => `/${route}`
);

/**
 * Auth views a signed-in visitor is bounced from, matched by path prefix.
 */
export const AUTH_GUEST_ONLY_ROUTES = GUEST_ONLY_AUTH_VIEWS.map(
	(view) => `/${viewPaths.auth[view]}`
);

/** Matches a pathname against a route list, including nested segments. */
export function matchesRoute(
	pathname: string,
	routes: readonly string[]
): boolean {
	return routes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
}

/**
 * Whether a request to an auth view should be sent back to the app root.
 *
 * Sign-out, OAuth callbacks and verification links are deliberately excluded:
 * they are legitimate destinations for an authenticated visitor. Sending
 * `/sign-out` to `/` was what trapped users on the home page instead of
 * letting them end their session.
 */
export function shouldLeaveAuthRoute(
	pathname: string,
	hasSession: boolean
): boolean {
	return hasSession && matchesRoute(pathname, AUTH_GUEST_ONLY_ROUTES);
}
