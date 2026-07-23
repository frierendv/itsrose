/**
 * Type guard for Node.js filesystem errors.
 */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return (
		(error instanceof Error ||
			(typeof error === "object" && error !== null)) &&
		"code" in error
	);
}

export function isNotFoundOrNotDir(error: unknown): boolean {
	if (isNodeError(error)) {
		return error.code === "ENOENT" || error.code === "ENOTDIR";
	}
	return false;
}
