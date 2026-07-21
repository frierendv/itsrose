import { USER_AGENT } from "@itsrose/system";
import axios from "axios";
import type { CreateAxiosDefaults } from "axios";
import axiosRetry, { type IAxiosRetryConfig } from "axios-retry";
import type { HttpClient } from "../types";
import { createWrappedClient } from "./wrap-client";

/**
 * Default axios-retry configuration
 * Retries 3 times with exponential backoff for network errors and 5xx responses
 */
const AXIOS_RETRY_CONFIG: IAxiosRetryConfig = {
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

export interface IHttpClientConfig extends Omit<
	CreateAxiosDefaults,
	"validateStatus"
> {
	/**
	 * Optional custom retry configuration for axios-retry.
	 * If not provided, the default retry configuration will be used.
	 */
	retryConfig?: IAxiosRetryConfig;
}

/**
 * Creates a configured axios HTTP client.
 */
export const createHttpClient = (config?: IHttpClientConfig) => {
	const instance = axios.create(config);
	instance.defaults.headers.common["User-Agent"] ??= USER_AGENT;

	// Attach retry logic
	axiosRetry(instance, { ...AXIOS_RETRY_CONFIG, ...config?.retryConfig });

	const client = createWrappedClient(instance);

	const callable = client.request as unknown as HttpClient;

	Object.assign(instance, client);
	return callable;
};
