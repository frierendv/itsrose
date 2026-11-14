import type { AxiosRequestConfig, CreateAxiosDefaults } from "axios";
import type { IAxiosRetryConfig } from "axios-retry";
import type {
	HttpAdapter,
	HttpRequestTransform,
	HttpResponseTransform,
} from "../core/transform";
import type { ErrorHandler } from "./executor";
import type { InferObjectValue } from "./internal";

/**
 * Configuration options for initializing an HTTP client instance.
 */
export interface HttpConfig extends Omit<
	CreateAxiosDefaults,
	"validateStatus"
> {
	/**
	 * Custom retry configuration for axios-retry, or `false` to disable retries.
	 */
	retryConfig?: IAxiosRetryConfig | false;

	/**
	 * Shorthand boolean to toggle default retries, or custom retry configuration.
	 */
	retry?: boolean | IAxiosRetryConfig;

	/**
	 * Custom User-Agent header value. Defaults to system USER_AGENT if omitted.
	 */
	userAgent?: string;

	/**
	 * Handler callback function to process and transform error responses.
	 */
	onError?: ErrorHandler;

	/**
	 * Whether to throw on network or transport errors when no response is received.
	 * When set to `false`, errors are returned in `HttpResponse.error` and `data` is `TData | undefined`.
	 *
	 * @default true
	 */
	throwOnError?: boolean;

	/**
	 * Transport adapter used to execute requests.
	 *
	 * @see {@linkcode HttpAdapter}
	 */
	adapter?: HttpAdapter;

	/**
	 * Hook that rewrites the outgoing request configuration before it is
	 * dispatched.
	 *
	 * @see {@linkcode HttpRequestTransform}
	 */
	requestTransform?: HttpRequestTransform;

	/**
	 * Hook that inspects or rewrites the response before it is handed back to
	 * the caller.
	 *
	 * @see {@linkcode HttpResponseTransform}
	 */
	responseTransform?: HttpResponseTransform;
}

/**
 * Resolves the default response data.
 */
export type ClientData<T extends HttpConfig, TData> =
	InferObjectValue<T, "throwOnError"> extends false
		? TData | undefined
		: TData;

/**
 * Resolves the default response data.
 */
export type ResolvesTData<T extends HttpConfig, TData> =
	InferObjectValue<T, "throwOnError"> extends false
		? TData | undefined
		: TData;
/**
 * Request-level configuration options extending AxiosRequestConfig.
 */
export type HttpRequestConfig = AxiosRequestConfig;

declare module "axios" {
	interface AxiosRequestConfig {
		/**
		 * Whether to throw on network or transport failure.
		 */
		throwOnError?: boolean;
		/**
		 * Callback function that receive error responses.
		 * I'll be called before {@linkcode HttpConfig.onError} top-level callback.
		 *
		 * @deprecated
		 * Use `.onError((data, error) => {})`
		 */
		onError?: ErrorHandler;
	}
}
