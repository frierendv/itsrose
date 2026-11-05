/**
 * Admin route access rules.
 *
 * Pure so the proxy decision is unit tested; the single privileged role is the
 * Better Auth `admin` plugin role, there is no second role system.
 */

export const ADMIN_PATH = "/admin";
export const ADMIN_ROLE = "admin";

/** `true` for `/admin` and anything nested under it. */
export function isAdminPath(pathname: string): boolean {
	if (!pathname) {
		return false;
	}
	return pathname === ADMIN_PATH || pathname.startsWith(`${ADMIN_PATH}/`);
}

/**
 * Admin paths require the admin role; every other path is unaffected.
 */
export function canAccessAdmin(
	pathname: string,
	role?: string | null
): boolean {
	return !isAdminPath(pathname) || role === ADMIN_ROLE;
}
