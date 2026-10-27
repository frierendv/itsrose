/**
 * Custom typed domain errors and resilient retry logic for S3 operations.
 */

export interface S3ErrorOptions extends ErrorOptions {
	code?: string;
	statusCode?: number;
	requestId?: string;
	retryable?: boolean;
	key?: string;
	bucket?: string;
}

/**
 * Base error class for all S3-related exceptions.
 */
export class S3Error extends Error {
	readonly code: string;
	readonly statusCode?: number;
	readonly requestId?: string;
	readonly retryable: boolean;
	readonly key?: string;
	readonly bucket?: string;

	constructor(message: string, options: S3ErrorOptions = {}) {
		super(message, options);
		this.name = this.constructor.name;
		this.code = options.code ?? "S3_ERROR";
		this.statusCode = options.statusCode;
		this.requestId = options.requestId;
		this.retryable = options.retryable ?? false;
		this.key = options.key;
		this.bucket = options.bucket;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/**
 * Thrown when an S3 object cannot be found (404 / NoSuchKey / NotFound).
 */
export class S3ObjectNotFoundError extends S3Error {
	constructor(key: string, bucket?: string, options: S3ErrorOptions = {}) {
		super(
			`Object "${key}" was not found${bucket ? ` in bucket "${bucket}"` : ""}.`,
			{
				...options,
				code: options.code ?? "NoSuchKey",
				statusCode: 404,
				retryable: false,
				key,
				bucket,
			}
		);
	}
}

/**
 * Thrown when access to a bucket or object is denied (403 / AccessDenied / Forbidden).
 */
export class S3BucketAccessError extends S3Error {
	constructor(
		message = "Access denied to S3 resource.",
		options: S3ErrorOptions = {}
	) {
		super(message, {
			...options,
			code: options.code ?? "AccessDenied",
			statusCode: 403,
			retryable: false,
		});
	}
}

/**
 * Thrown for network, connection reset, or timeout errors.
 */
export class S3NetworkError extends S3Error {
	constructor(
		message = "S3 network or socket error occurred.",
		options: S3ErrorOptions = {}
	) {
		super(message, {
			...options,
			code: options.code ?? "NETWORK_ERROR",
			retryable: true,
		});
	}
}

/**
 * Thrown for validation errors (e.g. invalid key, payload size exceeded).
 */
export class S3ValidationError extends S3Error {
	constructor(message: string, options: S3ErrorOptions = {}) {
		super(message, {
			...options,
			code: options.code ?? "VALIDATION_ERROR",
			statusCode: 400,
			retryable: false,
		});
	}
}

/**
 * General service-side error returned by AWS or S3-compatible service.
 */
export class S3ServiceError extends S3Error {
	constructor(message: string, options: S3ErrorOptions = {}) {
		super(message, {
			...options,
			code: options.code ?? "SERVICE_ERROR",
		});
	}
}

/**
 * Determines whether a caught error is transient and eligible for retry.
 */
export function isRetryableError(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}

	const err = error as Record<string, unknown>;

	if ("retryable" in err && typeof err.retryable === "boolean") {
		return err.retryable;
	}

	const statusCode = Number(
		err.$metadata
			? (err.$metadata as Record<string, unknown>).httpStatusCode
			: err.statusCode
	);
	if (
		statusCode === 429 ||
		statusCode === 500 ||
		statusCode === 502 ||
		statusCode === 503 ||
		statusCode === 504
	) {
		return true;
	}

	const code = String(err.name || err.code || "");
	const retryableCodes = new Set([
		"RequestTimeout",
		"RequestTimeoutException",
		"PriorRequestNotComplete",
		"SlowDown",
		"ProvisionedThroughputExceededException",
		"BandwidthLimitExceeded",
		"Throttling",
		"ThrottlingException",
		"ECANCELED",
		"ECONNRESET",
		"ECONNREFUSED",
		"ETIMEDOUT",
		"EPIPE",
		"ENOTFOUND",
	]);

	if (retryableCodes.has(code)) {
		return true;
	}

	const message = String(err.message || "").toLowerCase();
	return (
		message.includes("econnreset") ||
		message.includes("timed out") ||
		message.includes("socket hang up") ||
		message.includes("network error")
	);
}

/**
 * Wraps an unknown error into an appropriate typed S3Error instance.
 */
export function wrapS3Error(
	error: unknown,
	context: { key?: string; bucket?: string; operation?: string } = {}
): S3Error {
	if (error instanceof S3Error) {
		return error;
	}

	const err = (error ?? {}) as Record<string, unknown>;
	const message = String(err.message || "An unexpected S3 error occurred");
	const metadata = (err.$metadata ?? {}) as Record<string, unknown>;
	const statusCode = Number(metadata.httpStatusCode ?? err.statusCode);
	const code = String(err.name ?? err.code ?? "S3_UNKNOWN_ERROR");
	const requestId = String(metadata.requestId ?? err.requestId ?? "");
	const retryable = isRetryableError(error);

	const options: S3ErrorOptions = {
		cause: error instanceof Error ? error : undefined,
		code,
		statusCode: Number.isNaN(statusCode) ? undefined : statusCode,
		requestId: requestId || undefined,
		retryable,
		key: context.key,
		bucket: context.bucket,
	};

	if (statusCode === 404 || code === "NoSuchKey" || code === "NotFound") {
		return new S3ObjectNotFoundError(
			context.key ?? "unknown",
			context.bucket,
			options
		);
	}

	if (statusCode === 403 || code === "AccessDenied") {
		return new S3BucketAccessError(message, options);
	}

	if (code === "NETWORK_ERROR" || isRetryableError(error)) {
		return new S3NetworkError(message, options);
	}

	return new S3ServiceError(message, options);
}

export interface RetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	isRetryable?: (err: unknown) => boolean;
}

/**
 * Executes an async operation with exponential backoff and jitter for transient errors.
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	options: RetryOptions = {}
): Promise<T> {
	const maxRetries = options.maxRetries ?? 3;
	const baseDelayMs = options.baseDelayMs ?? 150;
	const maxDelayMs = options.maxDelayMs ?? 3000;
	const checkRetryable = options.isRetryable ?? isRetryableError;

	let attempt = 0;
	while (true) {
		try {
			return await operation();
		} catch (error) {
			attempt++;
			if (attempt > maxRetries || !checkRetryable(error)) {
				throw wrapS3Error(error);
			}

			// Exponential backoff with full jitter: delay = rand(0, min(maxDelay, base * 2^attempt))
			const exponentialDelay = Math.min(
				maxDelayMs,
				baseDelayMs * Math.pow(2, attempt)
			);
			const jitterDelay = Math.floor(Math.random() * exponentialDelay);
			await new Promise((resolve) => setTimeout(resolve, jitterDelay));
		}
	}
}
