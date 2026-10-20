import type { User } from "better-auth/types";

/** @internal */
export type InternalRoute<Path extends string> = `/itsrose${Path}`;

/** @internal */
export function createRoute<const Path extends `/${string}`>(
	path: Path
): InternalRoute<Path> {
	return `/itsrose${path}`;
}

/** @internal */
export function serialize<T>(value: T): string {
	if (typeof value !== "object") {
		return "{}";
	}
	return JSON.stringify(value);
}
/** @internal */
export function deserialize<T>(data: unknown): T | null {
	if (!data || typeof data !== "string") {
		return null;
	}
	try {
		const parsed = JSON.parse(data);
		return parsed as T;
	} catch {
		return null;
	}
}

/**
 * Returns true when the session user holds the "admin" role.
 */
export function isAdmin(user: User & { role?: string }): boolean {
	return user.role === "admin";
}

/**
 * Returns true when `session.user` is the same person as `targetUserId`
 * OR holds the "admin" role.
 */
export function isOwnerOrAdmin(
	user: User & { role?: string },
	targetUserId: string
): boolean {
	return user.id === targetUserId || isAdmin(user);
}
