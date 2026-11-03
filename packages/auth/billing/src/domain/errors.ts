/**
 * Domain errors used to translate business rule failures into transport
 * (Better Auth `APIError`) responses without leaking HTTP concerns downward.
 */
export type BillingErrorCode =
	| "BAD_REQUEST"
	| "CONFLICT"
	| "FORBIDDEN"
	| "NOT_FOUND"
	| "INTERNAL_SERVER_ERROR";

export class BillingDomainError extends Error {
	public readonly code: BillingErrorCode;

	constructor(code: BillingErrorCode, message: string) {
		super(message);
		this.name = "BillingDomainError";
		this.code = code;
	}
}

export function isBillingDomainError(
	error: unknown
): error is BillingDomainError {
	return error instanceof BillingDomainError;
}
