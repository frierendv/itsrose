import type {
	AxiosAdapter,
	AxiosInstance,
	AxiosResponse,
	InternalAxiosRequestConfig,
} from "axios";

/**
 * The outgoing request configuration handed to a {@linkcode HttpRequestTransform}.
 *
 * The configuration is the one the transport is about to dispatch: the client
 * defaults are already merged into it, so `baseURL` is the *resolved* base URL
 * of the request (the client default unless the request overrides it) and
 * `headers` is a live header container that can be mutated in place.
 */
export type HttpRequestTransformContext = InternalAxiosRequestConfig;

/**
 * The response handed to a {@linkcode HttpResponseTransform}.
 */
export type HttpResponseTransformContext = AxiosResponse;

/**
 * Transport adapter used to execute a request.
 *
 * An adapter replaces the network layer of the client, which is how a test
 * observes or stubs the transport without reaching the network.
 */
export type HttpAdapter = AxiosAdapter;

/**
 * Rewrites the outgoing request configuration before it is dispatched.
 *
 * The hook may mutate the configuration in place and return it, or return a
 * replacement configuration.
 */
export type HttpRequestTransform = (
	context: HttpRequestTransformContext
) => HttpRequestTransformContext | Promise<HttpRequestTransformContext>;

/**
 * Inspects or rewrites the response before it is handed back to the caller.
 *
 * Throwing from the hook rejects the request, which is how a transport maps a
 * successful HTTP response onto a domain error.
 */
export type HttpResponseTransform = (
	context: HttpResponseTransformContext
) => HttpResponseTransformContext | Promise<HttpResponseTransformContext>;

/**
 * The hooks a client owns, as they are handed over by its configuration.
 */
export interface HttpTransformOptions {
	/** Hook that rewrites the outgoing request configuration. */
	requestTransform?: HttpRequestTransform;
	/** Hook that inspects or rewrites the response. */
	responseTransform?: HttpResponseTransform;
}

/**
 * Registers the request and response hooks on the underlying instance.
 *
 * The hooks run inside the transport's own pipeline, which means they observe
 * the *resolved* configuration: the client defaults are already merged in, so
 * `config.baseURL` is the effective base URL of the request.
 *
 * @param instance Target Axios instance.
 * @param options Hooks to register, when the client has any.
 */
export function registerTransforms(
	instance: AxiosInstance,
	options?: HttpTransformOptions
): void {
	const requestTransform = options?.requestTransform;
	if (requestTransform) {
		instance.interceptors.request.use((requestConfig) =>
			requestTransform(requestConfig)
		);
	}

	const responseTransform = options?.responseTransform;
	if (responseTransform) {
		instance.interceptors.response.use((response) =>
			responseTransform(response)
		);
	}
}
