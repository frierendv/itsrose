import { ThirdPartyApiError } from "@itsrose/system";

/**
 * Context captured alongside an {@linkcode UpstreamApiError}.
 */
export interface UpstreamApiErrorContext {
	/**
	 * Logical name of the upstream service, e.g. `elevenlabs`.
	 */
	service: string;

	/**
	 * HTTP status the upstream answered with, when it answered at all.
	 */
	upstreamStatus?: number;

	/**
	 * The raw upstream payload the failure was derived from.
	 *
	 * Untrusted: it is whatever the upstream sent, kept for diagnosis.
	 */
	details?: unknown;

	/**
	 * The underlying failure, when there was one.
	 */
	cause?: unknown;

	/**
	 * Whether the failure was an upstream payload that did not match the
	 * schema the package publishes for it.
	 */
	isSchemaMismatch?: boolean;
}

/**
 * The one error an upstream failure is reported with.
 *
 * Every feature package raises it — directly or through one of its
 * specialised subclasses — so a caller never has to know which mapper
 * produced the error it caught.
 *
 * It extends the platform's {@linkcode ThirdPartyApiError} on purpose: the
 * shared route surface maps that class onto the standard upstream-failure
 * envelope, and the subclasses that already existed keep working.
 */
export class UpstreamApiError extends ThirdPartyApiError {
	/**
	 * Type guard flag to identify an upstream failure.
	 */
	public readonly isUpstreamApiError = true;

	/**
	 * Logical name of the upstream service, e.g. `elevenlabs`.
	 */
	public readonly service: string;

	/**
	 * HTTP status the upstream answered with, when it answered at all.
	 */
	public readonly upstreamStatus?: number;

	/**
	 * HTTP status the upstream answered with.
	 *
	 * The name the transport uses for it, kept so a caller that used to read
	 * `status` off a transport failure keeps working.
	 */
	public readonly status?: number;

	/**
	 * The raw upstream payload the failure was derived from.
	 */
	public readonly details?: unknown;

	/**
	 * Whether the failure was a payload that did not match the published
	 * schema — an upstream drift rather than an upstream refusal.
	 */
	public readonly isSchemaMismatch: boolean;

	/**
	 * Creates a new {@linkcode UpstreamApiError}.
	 *
	 * @param message Human-readable description of the failure.
	 * @param statusCode Status our own API answers with.
	 * @param context The upstream the failure came from.
	 */
	constructor(
		message: string,
		statusCode: number,
		context: UpstreamApiErrorContext
	) {
		super(message, statusCode);

		// Restore the prototype chain: the error travels across the package
		// boundary, and `instanceof` has to keep working.
		Object.setPrototypeOf(this, new.target.prototype);

		this.service = context.service;
		this.upstreamStatus = context.upstreamStatus;
		this.status = context.upstreamStatus;
		this.details = context.details;
		this.isSchemaMismatch = context.isSchemaMismatch ?? false;

		if (context.cause !== undefined) {
			this.cause = context.cause;
		}
	}
}

/**
 * Type guard to check whether an unknown payload is an
 * {@linkcode UpstreamApiError}.
 *
 * @param payload Unknown error object.
 * @returns True when the payload is an upstream failure.
 */
export function isUpstreamApiError(
	payload: unknown
): payload is UpstreamApiError {
	if (!payload || typeof payload !== "object") {
		return false;
	}

	if (payload instanceof UpstreamApiError) {
		return true;
	}

	return (
		"isUpstreamApiError" in payload && payload.isUpstreamApiError === true
	);
}
