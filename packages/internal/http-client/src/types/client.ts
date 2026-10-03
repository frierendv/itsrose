import type { HttpClient } from "../core/client";
import type { HttpPromise } from "../core/http-promise";
import type { HttpConfig, HttpRequestConfig, ResolvesTData } from "./config";
import type { ResolvesTError } from "./executor";

/**
 * Callable HTTP client instance supporting direct invocation as a function or via HTTP method helpers.
 *
 * @template T Configuration type extending {@linkcode HttpConfig}.
 * @template TError Extracted error type.
 */
export interface HttpClientInstance<
	T extends HttpConfig,
	TError = ResolvesTError<T>,
> extends HttpClient<T, TError> {
	<TData = unknown>(
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	<TData = unknown>(
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	<TData = unknown>(
		config: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;

	<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;

	/**
	 * Creates a new independent HTTP client instance with the provided configuration.
	 */
	create<C extends HttpConfig>(childConfig?: C): HttpClientInstance<C>;

	/**
	 * Creates a new HTTP client instance inheriting and merging configuration from this client.
	 */
	extend<C extends HttpConfig>(childConfig?: C): HttpClientInstance<C>;
}
