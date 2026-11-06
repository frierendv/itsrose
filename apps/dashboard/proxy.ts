import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
	AUTH_ROUTES,
	matchesRoute,
	shouldLeaveAuthRoute,
} from "./constants/route";
import { canAccessAdmin, isAdminPath } from "./lib/auth/admin-access";
import { authClient } from "./lib/auth/auth-client";

/**
 * Deduplicates the session RPC for a given request instance so the proxy path
 * performs at most one session fetch per request, even if invoked more than
 * once (e.g. by future instrumentation).
 *
 * Cross-request caching was evaluated and intentionally NOT added: a TTL cache
 * keyed by the session cookie would weaken revocation guarantees for a
 * security boundary. The single RPC per page load is the measured cost.
 */
const sessionPromises = new WeakMap<
	NextRequest,
	ReturnType<typeof authClient.getSession>
>();

async function getSessionForRequest(request: NextRequest) {
	const existing = sessionPromises.get(request);
	if (existing) {
		return existing;
	}
	const promise = authClient.getSession({
		fetchOptions: {
			headers: await headers(),
		},
	});
	sessionPromises.set(request, promise);
	return promise;
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
	const { data: session } = await getSessionForRequest(request);

	if (isAuthRoute) {
		if (shouldLeaveAuthRoute(pathname, Boolean(session))) {
			return NextResponse.redirect(new URL("/", request.url));
		}
		return NextResponse.next();
	}

	if (!session) {
		const redirectUrl = new URL("/sign-in", request.url);
		if (pathname !== "/") {
			redirectUrl.searchParams.set("redirectTo", pathname);
		}
		return NextResponse.redirect(redirectUrl);
	}

	// Admin paths are a privileged surface: redirect instead of rendering a
	// shell whose requests would all fail with 403.
	if (
		isAdminPath(pathname) &&
		!canAccessAdmin(pathname, (session.user as { role?: string })?.role)
	) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|manifest|robots|sitemap|assets).*)",
	],
};
