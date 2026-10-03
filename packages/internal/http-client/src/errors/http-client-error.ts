import { AxiosError, isAxiosError, isCancel, type AxiosResponse } from "axios";
import type { HttpRequestConfig } from "../types";

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
	 * Creates a new HttpClientError.
	 *
	 * @param cause The original {@linkcode AxiosError} that triggered this failure.
	 */
	constructor(cause: AxiosError) {
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

		// Store cause non-enumerably to prevent deeply nested console logs
		Object.defineProperty(this, "cause", {
			value: cause,
			enumerable: false,
			writable: false,
			configurable: true,
		});
	}
	/**
	 * HTTP status code returned by the server, if a response was received.
	 */
	public get status(): number | undefined {
		return this.cause.response?.status;
	}
	/**
	 * HTTP status text returned by the server, if a response was received.
	 */
	public get statusText(): string | undefined {
		return this.cause.response?.statusText;
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
		return this.cause?.config?.url;
	}
	/**
	 * Request HTTP method.
	 */
	public get method(): string | undefined {
		return this.cause?.config?.method;
	}
	/**
	 * Complete Axios response object, if available.
	 */
	public get response(): AxiosResponse | undefined {
		return this.cause?.response;
	}
	/**
	 * Complete request configuration used for the request.
	 */
	public get config(): HttpRequestConfig | undefined {
		return this.cause?.config as HttpRequestConfig | undefined;
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
	 * @returns {Record<string, any>}
	 */
	public toJSON(): Record<string, any> {
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
	 * @returns A normalized {@linkcode HttpClientError} instance.
	 */
	public static from(
		error: unknown,
		config?: HttpRequestConfig,
		request?: any,
		response?: AxiosResponse
	): HttpClientError {
		if (isHttpClientError(error)) {
			return error;
		}

		if (isAxiosError(error)) {
			return new HttpClientError(error);
		}

		const message = error instanceof Error ? error.message : String(error);
		const axiosError = new AxiosError(
			message,
			(error as any)?.code,
			config as any,
			request,
			response
		);

		if (error instanceof Error) {
			if (error.stack) {
				axiosError.stack = error.stack;
			}
			(axiosError as any).cause = error;
		}

		return new HttpClientError(axiosError);
	}
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

	return (
		payload instanceof HttpClientError ||
		(payload as Record<string, any>)?.isHttpClientError === true
	);
}
