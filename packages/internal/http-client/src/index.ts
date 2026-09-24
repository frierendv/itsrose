/**
 * @packageDocumentation
 * @category Internal
 */
export { fetcher } from "./fetcher";
export { createHttpClient, DEFAULT_RETRY_CONFIG } from "./http-client";
export { RequestBuilder } from "./request";
export type { IHttpClientConfig } from "./http-client";
export type * from "./types";

// Re-export core Axios utilities and errors for consumers
export {
	AxiosError,
	CanceledError,
	HttpStatusCode,
	isAxiosError,
	isCancel,
} from "axios";

// Re-export retry utilities for consumers
export {
	exponentialDelay,
	isIdempotentRequestError,
	isNetworkError,
	isNetworkOrIdempotentRequestError,
	isRetryableError,
	isSafeRequestError,
	linearDelay,
} from "axios-retry";
