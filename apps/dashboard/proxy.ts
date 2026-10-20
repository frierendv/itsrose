import { authClient } from "@/client/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_ROUTES } from "./constants/route";

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const { data: session } = await authClient.getSession({
		fetchOptions: {
			headers: await headers(),
		},
	});

	const isAuthRoute = AUTH_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
	if (isAuthRoute) {
		if (session) {
			return NextResponse.redirect(new URL("/", request.url));
		}
		return NextResponse.next();
	}
	if (!session) {
		return NextResponse.redirect(new URL("/sign-in", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
