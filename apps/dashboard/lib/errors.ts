/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * Auth RPC errors are plain objects (`{ message, status, ... }`), not always
 * `Error` instances, so narrowing must handle both shapes.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
	if (err instanceof Error && err.message) {
		return err.message;
	}
	if (typeof err === "object" && err !== null && "message" in err) {
		const message = (err as { message: unknown }).message;
		if (typeof message === "string" && message.length > 0) {
			return message;
		}
	}
	return fallback;
}
