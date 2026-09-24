import { USER_AGENT } from "@itsrose/system";
import axios, { type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import type { HttpClient, IHttpClientConfig, IRequestConfig } from "../types";
import { DEFAULT_RETRY_CONFIG, resolveRetryConfig } from "./retry";
import { createWrappedClient } from "./wrap-client";

export { DEFAULT_RETRY_CONFIG };
export type { IHttpClientConfig };

/**
 * Creates a configured, fluent Axios HTTP client.
 *
 * @param config Optional client defaults, headers, retry configuration, and User-Agent.
 * @returns A callable HttpClient instance with fluent methods and full Axios interoperability.
 */
export const createHttpClient = (config?: IHttpClientConfig): HttpClient => {
	const instance: AxiosInstance = axios.create(config);

	// Configure User-Agent header
	const userAgent = config?.userAgent ?? USER_AGENT;
	if (
		instance.defaults.headers &&
		typeof (instance.defaults.headers as any).set === "function"
	) {
		if (!(instance.defaults.headers as any).has("User-Agent")) {
			(instance.defaults.headers as any).set("User-Agent", userAgent);
		}
	} else if (instance.defaults.headers?.common) {
		instance.defaults.headers.common["User-Agent"] ??= userAgent;
	}

	// Attach retry logic
	const retryConfig = resolveRetryConfig(config);
	if (retryConfig !== false) {
		axiosRetry(instance, retryConfig);
	}

	const methods = createWrappedClient(instance);

	// Callable function implementation
	const client = function <TData = unknown, D = any>(
		urlOrConfig: string | IRequestConfig<D>,
		config?: IRequestConfig<D>
	) {
		return methods.request<TData, D>(urlOrConfig as any, config);
	};

	// Extension methods and instance accessors
	const extensions = {
		create: (childConfig?: IHttpClientConfig) =>
			createHttpClient(childConfig),

		extend: (childConfig?: IHttpClientConfig) =>
			createHttpClient({
				...config,
				...childConfig,
				headers: {
					...(config?.headers as any),
					...(childConfig?.headers as any),
				},
				retry: childConfig?.retry ?? config?.retry,
				retryConfig: childConfig?.retryConfig ?? config?.retryConfig,
			}),

		get instance(): AxiosInstance {
			return instance;
		},

		get raw(): AxiosInstance {
			return instance;
		},

		get axiosInstance(): AxiosInstance {
			return instance;
		},
	};

	// Assign Axios instance properties, wrapped methods, and extensions onto client
	Object.assign(client, instance, methods, extensions);

	// Ensure defaults and interceptors directly track the underlying Axios instance
	Object.defineProperty(client, "defaults", {
		get: () => instance.defaults,
		set: (val) => {
			instance.defaults = val;
		},
		enumerable: true,
		configurable: true,
	});

	Object.defineProperty(client, "interceptors", {
		get: () => instance.interceptors,
		enumerable: true,
		configurable: true,
	});

	// Use Proxy as fallback to delegate any other Axios instance methods (getUri, etc.)
	const httpClient = new Proxy(client as unknown as HttpClient, {
		get(target, prop, receiver) {
			if (prop in target) {
				return Reflect.get(target, prop, receiver);
			}
			const val = Reflect.get(instance, prop);
			if (typeof val === "function") {
				return val.bind(instance);
			}
			return val;
		},
		set(target, prop, value, receiver) {
			if (prop in target) {
				return Reflect.set(target, prop, value, receiver);
			}
			return Reflect.set(instance, prop, value);
		},
		has(target, prop) {
			return prop in target || prop in instance;
		},
	});

	return httpClient;
};
