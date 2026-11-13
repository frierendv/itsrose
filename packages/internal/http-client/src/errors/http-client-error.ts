import { AxiosError, isAxiosError, isCancel, type AxiosResponse } from "axios";
import type { HttpRequestConfig } from "../types";

/**
 * Transport context captured alongside an {@linkcode HttpClientError}.
 */
export interface HttpClientErrorContext {
	/**
	 * Request configuration that produced the failure.
	 */
	config?: HttpRequestConfig;
	/**
	 * Underlying request object, when the transport exposes one.
	 */
	request?: unknown;
	/**
	 * Server response associated with the failure, when one was received.
	 */
	response?: AxiosResponse;
}

/**
 * Custom error thrown by the HTTP client when a transport, network, or client-side failure occurs.
 */
export class HttpClientError extends Error {
	/**
	 * The name of the error.
	 */
	public override readonly name = "HttpClientError";
	/**
	 * Type guard flag to identify HTTP client errors.
	 */
	public readonly isHttpClientError = true;
	/**
	 * The original, underlying Axios error.
	 * Kept non-enumerable to prevent cluttering console output.
	 */
	public override readonly cause!: AxiosError;
	/**
	 * The request configuration that produced this error, when available.
	 *
	 * Stored separately from {@linkcode HttpClientError.cause} because the public
	 * request configuration type is the pre-resolution shape, while Axios only
	 * exposes the resolved internal shape.
	 */
	private readonly requestConfig?: HttpRequestConfig;
	/**
	 * The underlying request object, when the transport exposes one.
	 */
	private readonly requestPayload?: unknown;
	/**
	 * The server response associated with this error, when one was received.
	 */
	private readonly responsePayload?: AxiosResponse;
	/**
	 * Creates a new HttpClientError.
	 *
	 * @param cause The original {@linkcode AxiosError} that triggered this failure.
	 * @param context Transport context captured with the failure.
	 */
	constructor(cause: AxiosError, context: HttpClientErrorContext = {}) {
		const status = cause.response?.status;
		const statusText = cause.response?.statusText;

		const details =
			cause.message ||
			(status
				? `Request failed with status code ${status}${statusText ? ` (${statusText})` : ""}`
				: "HTTP request failed");

		super(details);

		// Restore prototype chain immediately.
		Object.setPrototypeOf(this, new.target.prototype);

		// Fixes V8 stack trace capture.
		if (typeof Error.captureStackTrace === "function") {
			Error.captureStackTrace(this, this.constructor);
		}

		this.requestConfig = context.config;
		this.requestPayload = context.request;
		this.responsePayload = context.response;

		// Store cause non-enumerably to prevent deeply nested console logs
		Object.defineProperty(this, "cause", {
			value: cause,
			enumerable: false,
			writable: false,
			configurable: true,
		});
	}
	/**
	 * The server response associated with the failure, when one was received.
	 */
	private get resolvedResponse(): AxiosResponse | undefined {
		return this.responsePayload ?? this.cause?.response;
	}
	/**
	 * HTTP status code returned by the server, if a response was received.
	 */
	public get status(): number | undefined {
		return this.resolvedResponse?.status;
	}
	/**
	 * HTTP status text returned by the server, if a response was received.
	 */
	public get statusText(): string | undefined {
		return this.resolvedResponse?.statusText;
	}
	/**
	 * Error code identifier.
	 */
	public get code(): string | undefined {
		return this.cause?.code;
	}
	/**
	 * Request URL that triggered the error.
	 */
	public get url(): string | undefined {
		return this.requestConfig?.url ?? this.cause?.config?.url;
	}
	/**
	 * Request HTTP method.
	 */
	public get method(): string | undefined {
		return this.requestConfig?.method ?? this.cause?.config?.method;
	}
	/**
	 * Complete Axios response object, if available.
	 */
	public get response(): AxiosResponse | undefined {
		return this.resolvedResponse;
	}
	/**
	 * Underlying request object, if available.
	 */
	public get request(): unknown {
		return this.requestPayload ?? this.cause?.request;
	}
	/**
	 * Complete request configuration used for the request.
	 */
	public get config(): HttpRequestConfig | undefined {
		return this.requestConfig ?? this.cause?.config;
	}
	/**
	 * Whether this error was caused by a network disconnection or DNS failure.
	 */
	public get isNetworkError(): boolean {
		if (this.response) {
			return false;
		}
		if (this.isTimeout || this.isCanceled) {
			return false;
		}
		return (
			this.code === "ERR_NETWORK" ||
			this.message.toLowerCase().includes("network error") ||
			Boolean(
				this.code &&
				this.code !== "ECONNABORTED" &&
				this.code !== "ERR_CANCELED"
			)
		);
	}
	/**
	 * Whether this error was caused by a request timeout.
	 */
	public get isTimeout(): boolean {
		return (
			this.code === "ECONNABORTED" ||
			this.code === "ETIMEDOUT" ||
			this.message.toLowerCase().includes("timeout")
		);
	}
	/**
	 * Whether this error was caused by request cancellation / abort signal.
	 */
	public get isCanceled(): boolean {
		return this.code === "ERR_CANCELED" || isCancel(this.cause);
	}

	/**
	 * Serialized error to JSON object.
	 *
	 * @returns {Record<string, unknown>}
	 */
	public toJSON(): Record<string, unknown> {
		const causeJson =
			typeof this.cause?.toJSON === "function" ? this.cause.toJSON() : {};
		return {
			...causeJson,
			name: this.name,
			message: this.message,
			status: this.status,
			statusText: this.statusText,
			code: this.code,
			url: this.url,
			method: this.method,
			isNetworkError: this.isNetworkError,
			isTimeout: this.isTimeout,
			isCanceled: this.isCanceled,
			stack: this.stack,
		};
	}
	/**
	 * Creates or casts an unknown error into an {@linkcode HttpClientError}.
	 *
	 * @param error Unknown error payload or existing error instance.
	 * @param config Optional request configuration.
	 * @param request Optional underlying request object.
	 * @param response Optional server response associated with the failure.
	 * @returns A normalized {@linkcode HttpClientError} instance.
	 */
	public static from(
		error: unknown,
		config?: HttpRequestConfig,
		request?: unknown,
		response?: AxiosResponse
	): HttpClientError {
		if (isHttpClientError(error)) {
			return error;
		}

		if (isAxiosError(error)) {
			return new HttpClientError(error, { config, request, response });
		}

		const message = error instanceof Error ? error.message : String(error);
		const axiosError = new AxiosError(message, extractErrorCode(error));

		if (error instanceof Error) {
			if (error.stack) {
				axiosError.stack = error.stack;
			}
			axiosError.cause = error;
		}

		return new HttpClientError(axiosError, { config, request, response });
	}
}

/**
 * Extracts a string error code from an unknown error payload.
 *
 * @param error Unknown error payload.
 * @returns The `code` property when it is a string, otherwise `undefined`.
 */
function extractErrorCode(error: unknown): string | undefined {
	if (typeof error !== "object" || error === null || !("code" in error)) {
		return undefined;
	}

	const code = error.code;
	return typeof code === "string" ? code : undefined;
}

/**
 * Type guard to check whether an unknown error payload is an {@link HttpClientError}.
 *
 * @param payload Unknown error object.
 * @returns True if payload is an HttpClientError or an AxiosError.
 */
export function isHttpClientError(
	payload: unknown
): payload is HttpClientError {
	if (!payload || typeof payload !== "object") {
		return false;
	}

	if (payload instanceof HttpClientError) {
		return true;
	}

	return "isHttpClientError" in payload && payload.isHttpClientError === true;
}
