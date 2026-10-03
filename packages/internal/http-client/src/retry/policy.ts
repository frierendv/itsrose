import {
	exponentialDelay,
	isNetworkOrIdempotentRequestError,
	type IAxiosRetryConfig,
} from "axios-retry";
import { isHttpClientError } from "../errors";
import type { HttpConfig } from "../types";

/**
 * Retry configuration interface alias from axios-retry.
 */
export type RetryConfig = IAxiosRetryConfig;

/**
 * Default retry policy for HTTP requests.
 * Retries up to 3 times with exponential backoff on network errors or 5xx server responses.
 */
export const defaultRetryConfig: RetryConfig = {
	retries: 3,
	retryDelay: exponentialDelay,
	retryCondition: (error) => {
		// no retry if is HttpClientError
		if (isHttpClientError(error) || error?.isAxiosError === true) {
			return false;
		}

		if ((error as any)?.__CANCEL__ || error.code === "ERR_CANCELED") {
			return false;
		}

		if (error.response && error.response.status < 500) {
			return false;
		}

		return isNetworkOrIdempotentRequestError(error);
	},
} as const;

/**
 * Backward compatibility constant alias for {@linkcode defaultRetryConfig}.
 */
export const DEFAULT_RETRY_CONFIG = defaultRetryConfig;

/**
 * Resolves the effective retry configuration from client options.
 *
 * @param config Optional client configuration.
 * @returns Resolved retry configuration, or `false` if retries are explicitly disabled.
 */
export function resolveRetryConfig(config?: HttpConfig): RetryConfig | false {
	if (config?.retry === false || config?.retryConfig === false) {
		return false;
	}

	const userRetryConfig =
		typeof config?.retry === "object"
			? config.retry
			: (config?.retryConfig ?? {});

	return {
		...defaultRetryConfig,
		...userRetryConfig,
	};
}
