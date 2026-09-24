import axiosRetry, { type IAxiosRetryConfig } from "axios-retry";
import type { IHttpClientConfig } from "../types";

/**
 * Default axios-retry configuration.
 * Retries up to 3 times with exponential backoff on network errors,
 * idempotent requests, and 5xx server responses.
 */
export const DEFAULT_RETRY_CONFIG: IAxiosRetryConfig = {
	retries: 3,
	retryDelay: axiosRetry.exponentialDelay,
	retryCondition: (error) => {
		// Retry on network errors, idempotent requests, and server errors
		return (
			axiosRetry.isNetworkOrIdempotentRequestError(error) ||
			(error.response?.status ?? 0) >= 500
		);
	},
} as const;

/**
 * Resolves retry configuration from client options.
 *
 * @param config Optional client configuration.
 * @returns Resolved retry configuration or false if retries are disabled.
 */
export const resolveRetryConfig = (
	config?: IHttpClientConfig
): IAxiosRetryConfig | false => {
	if (config?.retry === false || config?.retryConfig === false) {
		return false;
	}

	const userRetryConfig =
		typeof config?.retry === "object"
			? config.retry
			: (config?.retryConfig ?? {});

	return {
		...DEFAULT_RETRY_CONFIG,
		...userRetryConfig,
	};
};
