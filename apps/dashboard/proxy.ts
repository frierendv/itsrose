import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES } from "./constants/route";
import { authClient } from "./lib/auth/auth-client";

const matchesRoute = (pathname: string, routes: string[]) =>
	routes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;
	const isAuthRoute = matchesRoute(pathname, AUTH_ROUTES);
	const { data: session } = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
		},
	});

	if (isAuthRoute) {
		if (session) {
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

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|manifest|robots|sitemap|assets).*)",
	],
};
