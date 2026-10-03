import axios, { type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import { resolveRetryConfig } from "../retry";
import type {
	ErrorHandler,
	HttpConfig,
	HttpRequestConfig,
	ResolvesTData,
	ResolvesTError,
} from "../types";
import { applyDefaultUserAgent } from "../utils";
import { createHttpExecutor } from "./executor";
import { HttpPromise } from "./http-promise";

/**
 * Core HTTP client managing Axios instances, defaults, interceptors, and request dispatching.
 *
 * @template T Configuration options type extending {@linkcode HttpConfig}.
 * @template TError Extracted error type from config error handler.
 */
export class HttpClient<
	T extends HttpConfig = HttpConfig,
	TError = ResolvesTError<T>,
> {
	private readonly _instance: AxiosInstance;
	private readonly _errorHandler?: ErrorHandler<TError>;
	private readonly _throwOnError: boolean;
	/**
	 * Access the underlying Axios interceptor manager.
	 */
	public get interceptors() {
		return this._instance.interceptors;
	}
	/**
	 * Access the underlying Axios instance default configurations.
	 */
	public get defaults() {
		return this._instance.defaults;
	}
	/**
	 * Direct access to the internal Axios instance.
	 */
	public get axiosInstance(): AxiosInstance {
		return this._instance;
	}
	/**
	 * Effective policy on throwing on network/transport failure.
	 */
	public get throwOnError(): boolean {
		return this._throwOnError;
	}

	constructor(public readonly config?: T) {
		// const { onError, ...restConfig } = config || ({} as T);

		const instance = axios.create(config);

		// Apply User-Agent header defaults
		applyDefaultUserAgent(instance, config?.userAgent);

		// Attach retry interceptor if enabled
		const retryConfig = resolveRetryConfig(config);
		if (retryConfig !== false) {
			axiosRetry(instance, retryConfig);
		}

		this._errorHandler = config?.onError as ErrorHandler<TError>;
		this._throwOnError = config?.throwOnError ?? true;
		this._instance = instance;
	}
	/**
	 * Dispatches a generic HTTP request.
	 *
	 * @param config Request configuration options.
	 */
	public request<TData = unknown>(
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public request<TData = unknown>(
		config: HttpRequestConfig & { throwOnErro: true }
	): HttpPromise<TData, TError>;
	public request<TData = unknown>(
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public request<TData = unknown>(
		config: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<ResolvesTData<T, TData>, TError>(
			createHttpExecutor<ResolvesTData<T, TData>, TError>(
				() => this._instance.request<ResolvesTData<T, TData>>(config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP GET request.
	 */
	public get<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public get<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public get<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public get<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<ResolvesTData<T, TData>, TError>(
			createHttpExecutor<ResolvesTData<T, TData>, TError>(
				() => this._instance.get<ResolvesTData<T, TData>>(url, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP DELETE request.
	 */
	public delete<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public delete<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public delete<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public delete<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.delete<TData>(url, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP HEAD request.
	 */
	public head<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public head<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public head<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public head<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.head<TData>(url, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP OPTIONS request.
	 */
	public options<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public options<TData = unknown>(
		url: string,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public options<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public options<TData = unknown>(
		url: string,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.options<TData>(url, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP POST request.
	 */
	public post<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public post<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public post<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody | undefined,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public post<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.post<TData>(url, data, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP PUT request.
	 */
	public put<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public put<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public put<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody | undefined,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public put<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.put<TData>(url, data, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Dispatches an HTTP PATCH request.
	 */
	public patch<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: false }
	): HttpPromise<TData | undefined, TError>;
	public patch<TData = unknown, TBody = unknown>(
		url: string,
		data: TBody | undefined,
		config: HttpRequestConfig & { throwOnError: true }
	): HttpPromise<TData, TError>;
	public patch<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody | undefined,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError>;
	public patch<TData = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: HttpRequestConfig
	): HttpPromise<ResolvesTData<T, TData>, TError> {
		return new HttpPromise<TData, TError>(
			createHttpExecutor<TData, TError>(
				() => this._instance.patch<TData>(url, data, config),
				this._throwOnError
			),
			this._errorHandler
		);
	}
	/**
	 * Creates a new client instance with independent configuration.
	 */
	public create<C extends HttpConfig>(childConfig?: C): HttpClient<C> {
		return new HttpClient<C>(childConfig);
	}
	public static create<C extends HttpConfig>(childConfig?: C): HttpClient<C> {
		return new HttpClient<C>(childConfig);
	}
	/**
	 * Creates a new client instance inheriting and merging configuration from the current client.
	 */
	public extend<C extends HttpConfig>(childConfig?: C): HttpClient<C> {
		const mergedConfig = {
			...this.config,
			...childConfig,
			headers: {
				...this.config?.headers,
				...childConfig?.headers,
			},
			retry: childConfig?.retry ?? this.config?.retry,
			retryConfig: childConfig?.retryConfig ?? this.config?.retryConfig,
			onError: childConfig?.onError ?? this._errorHandler,
			throwOnError: childConfig?.throwOnError ?? this._throwOnError,
		} as C;

		return new HttpClient<C>(mergedConfig);
	}
}
