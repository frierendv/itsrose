import type {
	AxiosInstance,
	AxiosRequestConfig,
	AxiosResponse,
	InternalAxiosRequestConfig,
} from "axios";

/** @internal */
export type Merge<T, U> = Omit<T, keyof U> & U;
/** @internal */
export type HttpMethod =
	"get" | "post" | "put" | "patch" | "delete" | "head" | "options";

/**
 * Callback function to handle and parse error responses.
 *
 * @template Err The formatted error return type.
 * @param {any} data Raw response data or error payload.
 * @param {number} [status] HTTP status code.
 * @returns {Err | Promise<Err>} Parsed error structure.
 */
export type OnError<Err = unknown> = (
	data: any,
	status?: number
) => Err | Promise<Err>;

/**
 * Standardized HTTP response interface.
 *
 * @template TData Response payload type.
 * @template TError Error payload type.
 */
export interface IHttpResponse<TData, TError = unknown> extends Pick<
	AxiosResponse<TData>,
	"data" | "status" | "statusText" | "headers"
> {
	/**
	 * The error that occurred during the request, if any.
	 *
	 * Catch the error in the `onError` handler and return a value to populate this field.
	 */
	error?: TError;
}

/**
 * Fluent builder for execution of HTTP requests.
 *
 * @template TData Response data type.
 * @template Err Formatted error type.
 */
export interface IRequestBuilder<
	TData = unknown,
	Err = unknown,
> extends PromiseLike<IHttpResponse<TData, Err>> {
	/**
	 * Handles errors that occur during the request and allows you to provide a custom `error` response.
	 *
	 * **This method replaces the `.catch` method.**
	 */
	onError<NErr>(handler: OnError<NErr>): IRequestBuilder<TData, NErr>;
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
	TData = unknown,
> extends AxiosRequestConfig<TData> {
	[key: string]: any;
}

/** @internal */
export interface IHttpClient {
	<T = unknown>(config: IRequestConfig): IRequestBuilder<T>;

	request<T = unknown>(config: IRequestConfig): IRequestBuilder<T>;

	get<T = unknown>(url: string, config?: IRequestConfig): IRequestBuilder<T>;

	delete<T = unknown>(
		url: string,
		config?: IRequestConfig
	): IRequestBuilder<T>;

	head<T = unknown>(url: string, config?: IRequestConfig): IRequestBuilder<T>;

	options<T = unknown>(
		url: string,
		config?: IRequestConfig
	): IRequestBuilder<T>;

	post<T = unknown>(
		url: string,
		data?: any,
		config?: IRequestConfig
	): IRequestBuilder<T>;

	put<T = unknown>(
		url: string,
		data?: any,
		config?: IRequestConfig
	): IRequestBuilder<T>;

	patch<T = unknown>(
		url: string,
		data?: any,
		config?: IRequestConfig
	): IRequestBuilder<T>;
}

/**
 * Customized HTTP client type wrapping Axios with fluent request builders.
 */
export type HttpClient = Merge<AxiosInstance, IHttpClient>;
