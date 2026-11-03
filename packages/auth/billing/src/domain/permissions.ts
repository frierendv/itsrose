export type SessionUser = {
	id: string;
	role?: string | null;
};

/**
 * Returns true when the session user holds the "admin" role.
 */
export function isAdmin(user: SessionUser): boolean {
	return user.role === "admin";
}

/**
 * Returns true when `session.user` is the same person as `targetUserId`
 * OR holds the "admin" role.
 */
export function isOwnerOrAdmin(
	user: SessionUser,
	targetUserId: string
): boolean {
	return user.id === targetUserId || isAdmin(user);
}
