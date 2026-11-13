import { isCancel } from "axios";
import {
	exponentialDelay,
	isNetworkError,
	type IAxiosRetryConfig,
} from "axios-retry";
import type { HttpConfig } from "../types";

/**
 * Retry configuration interface alias from axios-retry.
 */
export type RetryConfig = IAxiosRetryConfig;

/**
 * Default retry policy for HTTP requests.
 * Retries up to 3 times with exponential backoff on network errors or 5xx server responses.
 *
 * The condition is expressed over the failure itself — the status code, or the
 * absence of a response — never over the transport's brand. `axios-retry`
 * always hands this callback the raw `AxiosError`, so a guard on
 * `isAxiosError` would reject every failure and the policy would never fire.
 *
 * Note that 5xx is retried for every method, including ones that mutate state.
 * Callers issuing non-idempotent requests should narrow the policy with
 * `retry: { retryCondition }` so a replayed write cannot happen twice.
 */
export const defaultRetryConfig: RetryConfig = {
	retries: 3,
	retryDelay: exponentialDelay,
	retryCondition: (error) => {
		// A cancelled request is a decision, never a blip.
		if (isCancel(error) || error?.code === "ERR_CANCELED") {
			return false;
		}

		// A response the server chose to send (4xx) is an answer, not a blip.
		const status = error?.response?.status;
		if (typeof status === "number" && status < 500) {
			return false;
		}

		// No response at all — the request never reached a server.
		if (!error?.response) {
			return isNetworkError(error);
		}

		// 5xx — the server received the request and failed to handle it.
		return true;
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
