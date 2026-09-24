import type {
	AxiosInstance,
	AxiosRequestConfig,
	AxiosResponse,
	CreateAxiosDefaults,
	InternalAxiosRequestConfig,
} from "axios";
import type { IAxiosRetryConfig } from "axios-retry";

/** @internal */
export type Merge<T, U> = Omit<T, keyof U> & U;

/**
 * Supported HTTP methods.
 */
export type HttpMethod =
	"get" | "post" | "put" | "patch" | "delete" | "head" | "options";

/**
 * Callback function to handle and parse error responses.
 *
 * @template TError The formatted error return type.
 * @param {any} data Raw response data or error payload.
 * @param {number} [status] HTTP status code from response, if available.
 * @param {unknown} [error] The underlying error object thrown during request execution.
 * @returns {TError | Promise<TError>} Parsed error structure.
 */
export type OnError<TError = unknown> = (
	data: any,
	status?: number,
	error?: unknown
) => TError | Promise<TError>;

/**
 * Standardized HTTP response interface.
 *
 * @template TData Response payload type.
 * @template TError Error payload type.
 */
export interface IHttpResponse<TData = any, TError = unknown> {
	/**
	 * Response body returned by the server.
	 */
	data: TData;
	/**
	 * HTTP status code from response, or undefined if the request failed without server response.
	 */
	status?: number;
	/**
	 * HTTP status message from the server response.
	 */
	statusText?: string;
	/**
	 * HTTP headers received from the server.
	 */
	headers: AxiosResponse<TData>["headers"];
	/**
	 * The error that occurred during the request, if any.
	 *
	 * Catch the error in the `onError` handler and return a value to populate this field.
	 */
	error?: TError;
	/**
	 * Boolean indicating whether the HTTP status is between 200 and 299 without error.
	 */
	ok?: boolean;
	/**
	 * Request configuration passed to Axios.
	 */
	config?: AxiosRequestConfig;
	/**
	 * Underlying request object.
	 */
	request?: any;
}

/**
 * Fluent builder for execution of HTTP requests.
 * Extends standard `Promise` to allow direct `await`, `.then()`, `.catch()`, and `.finally()`.
 *
 * @template TData Response data type.
 * @template TError Formatted error type.
 */
export interface IRequestBuilder<
	TData = unknown,
	TError = unknown,
> extends Promise<IHttpResponse<TData, TError>> {
	/**
	 * Handles errors that occur during the request and allows you to provide a custom `error` response.
	 *
	 * @param handler Error handler callback.
	 * @returns A new RequestBuilder instance with the specified error type.
	 */
	onError<TNewError>(
		handler: OnError<TNewError>
	): IRequestBuilder<TData, TNewError>;

	/**
	 * Directly unwraps and returns `data` upon successful response.
	 * Throws the request error or formatted error if the request failed.
	 *
	 * @throws The error if `error` is present.
	 * @returns The resolved data payload.
	 */
	unwrap(): Promise<TData>;

	/**
	 * Explicitly converts the builder to a standard native Promise.
	 */
	toPromise(): Promise<IHttpResponse<TData, TError>>;
}

/** @internal */
export interface IInternalRequestConfig<
	TData = unknown,
> extends InternalAxiosRequestConfig<TData> {
	[key: string]: any;
}

/**
 * Configuration options for HTTP requests.
 *
 * @template TData Data payload type.
 */
export interface IRequestConfig<
	TData = any,
> extends AxiosRequestConfig<TData> {}

/**
 * Core HTTP client methods providing fluent request builders for all standard HTTP methods.
 */
export interface IHttpClientMethods {
	/**
	 * Generic request method accepting configuration or URL + configuration.
	 */
	request<TData = unknown, D = any>(
		config: IRequestConfig<D>
	): IRequestBuilder<TData>;
	request<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a GET request.
	 */
	get<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a DELETE request.
	 */
	delete<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a HEAD request.
	 */
	head<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform an OPTIONS request.
	 */
	options<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a POST request with body data.
	 */
	post<TData = unknown, D = any>(
		url: string,
		data?: D,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a PUT request with body data.
	 */
	put<TData = unknown, D = any>(
		url: string,
		data?: D,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Perform a PATCH request with body data.
	 */
	patch<TData = unknown, D = any>(
		url: string,
		data?: D,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;
}

/**
 * Options for creating an HTTP client instance.
 */
export interface IHttpClientConfig extends Omit<
	CreateAxiosDefaults,
	"validateStatus"
> {
	/**
	 * Optional custom retry configuration for axios-retry, or `false` to disable retries.
	 */
	retryConfig?: IAxiosRetryConfig | false;

	/**
	 * Optional shorthand boolean to toggle default retries, or custom retry configuration.
	 */
	retry?: boolean | IAxiosRetryConfig;

	/**
	 * Custom User-Agent header value. Defaults to system USER_AGENT.
	 */
	userAgent?: string;
}

/**
 * Standardized HTTP client interface supporting callable execution, builder methods, and Axios interoperability.
 */
export interface IHttpClient extends IHttpClientMethods {
	/**
	 * Callable signature executing requests with a configuration object.
	 */
	<TData = unknown, D = any>(
		config: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Callable signature executing requests with URL string and optional configuration.
	 */
	<TData = unknown, D = any>(
		url: string,
		config?: IRequestConfig<D>
	): IRequestBuilder<TData>;

	/**
	 * Creates a new independent HttpClient instance with custom options.
	 */
	create(config?: IHttpClientConfig): HttpClient;

	/**
	 * Extends current client options and returns a new merged HttpClient instance.
	 */
	extend(config?: IHttpClientConfig): HttpClient;

	/**
	 * The underlying AxiosInstance.
	 */
	readonly instance: AxiosInstance;

	/**
	 * Alias for the underlying AxiosInstance.
	 */
	readonly raw: AxiosInstance;

	/**
	 * Alias for the underlying AxiosInstance.
	 */
	readonly axiosInstance: AxiosInstance;
}

/**
 * Customized HTTP client type wrapping Axios with fluent request builders.
 */
export type HttpClient = Merge<AxiosInstance, IHttpClient>;
