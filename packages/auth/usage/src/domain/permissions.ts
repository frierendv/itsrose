/**
 * Authorization helper for usage administration.
 *
 * Wraps the single role system the project already has (the Better Auth
 * `admin` plugin role). It must never define roles of its own.
 */
export type UsageSessionUser = {
	id: string;
	role?: string | null;
};

export const USAGE_ADMIN_ROLE = "admin";

export function isUsageAdmin(
	user: UsageSessionUser | null | undefined
): boolean {
	return user?.role === USAGE_ADMIN_ROLE;
}
