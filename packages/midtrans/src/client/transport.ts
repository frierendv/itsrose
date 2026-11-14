import {
	HttpClient,
	HttpClientError,
	type HttpAdapter,
	type HttpConfig,
} from "@itsrose/http-client";
import { DEFAULT_TIMEOUT, MAX_REQUEST_SIZE } from "../constants";
import type { MidtransHeaders } from "../typings";
import {
	isSuccessfulResponse,
	readBusinessStatusCode,
} from "./business-status";
import { errorHandler, type MidtransApiError } from "./error";
import type { MidtransMerchant } from "./merchant";

/**
 * Options required to build the shared Midtrans HTTP transport.
 *
 * @internal
 */
export interface TransportOptions {
	/** Resolved merchant used for auth and endpoint matching. */
	readonly merchant: MidtransMerchant;
	/** Default headers merged into every request. */
	readonly headers?: MidtransHeaders;
	/** Default request timeout in milliseconds. */
	readonly timeout?: number;
	/**
	 * Transport adapter used to execute the requests.
	 *
	 * The adapter replaces the network layer, which is the supported seam for
	 * stubbing the transport in a test.
	 */
	readonly adapter?: HttpAdapter;
}

/**
 * Creates the shared HTTP client used by every Midtrans service.
 *
 * The transport owns the Midtrans-specific request and response hooks:
 *
 * - BASIC auth is attached only for requests targeting the configured Midtrans
 *   hosts.
 * - Midtrans Core API business status codes surface as `HttpResponse.error`
 *   instead of being treated as successful HTTP responses.
 *
 * @internal
 */
export function createTransport(
	options: TransportOptions
): HttpClient<HttpConfig, MidtransApiError> {
	const { merchant, headers, timeout, adapter } = options;

	const isMidtransUrl = (url?: string): boolean =>
		url === merchant.baseUrl || url === merchant.snapBaseUrl;

	const http = new HttpClient<HttpConfig, MidtransApiError>({
		onError: errorHandler,
		throwOnError: true,
		maxBodyLength: MAX_REQUEST_SIZE,
		maxContentLength: MAX_REQUEST_SIZE,
		timeout: timeout ?? DEFAULT_TIMEOUT,
		baseURL: merchant.baseUrl,
		adapter,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...headers,
		},
		requestTransform: (config) => {
			if (isMidtransUrl(config.baseURL)) {
				void config.headers.set(
					"Authorization",
					merchant.createAuthKey()
				);
			}
			return config;
		},
		responseTransform: async (raw) => {
			if (!isMidtransUrl(raw.config.baseURL)) {
				return raw;
			}

			const contentType = raw.headers?.["content-type"]?.toString();
			if (!contentType?.includes("application/json")) {
				return raw;
			}

			const businessStatus = readBusinessStatusCode(
				raw?.data,
				raw.headers
			);
			if (isSuccessfulResponse(businessStatus, raw.status)) {
				return raw;
			}

			throw HttpClientError.from(
				"Midtrans Client error. If this message show up it means you or client have done something wrong.",
				raw.config,
				raw.request,
				raw
			);
		},
	});

	return http;
}
