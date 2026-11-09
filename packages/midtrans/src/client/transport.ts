import { HttpClient, HttpClientError } from "@itsrose/http-client";
import { DEFAULT_TIMEOUT, MAX_REQUEST_SIZE } from "../constants";
import { HttpStatus } from "../schema/error/status";
import type { MidtransHeaders } from "../typings";
import { errorHandler } from "./error";
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
}

/**
 * Creates the shared HTTP client used by every Midtrans service.
 *
 * The transport owns the Midtrans-specific request and response interceptors:
 *
 * - BASIC auth is attached only for requests targeting the configured Midtrans
 *   hosts.
 * - Midtrans Core API business status codes surface as `HttpResponse.error`
 *   instead of being treated as successful HTTP responses.
 *
 * @internal
 */
export function createTransport(options: TransportOptions): HttpClient {
	const { merchant, headers, timeout } = options;

	const http = new HttpClient({
		onError: errorHandler,
		throwOnError: true,
		maxBodyLength: MAX_REQUEST_SIZE,
		maxContentLength: MAX_REQUEST_SIZE,
		timeout: timeout ?? DEFAULT_TIMEOUT,
		baseURL: merchant.baseUrl,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...headers,
		},
	});

	const isMidtransUrl = (url?: string): boolean =>
		url === merchant.baseUrl || url === merchant.snapBaseUrl;

	http.interceptors.request.use((config) => {
		if (isMidtransUrl(config.baseURL)) {
			void config.headers.set("Authorization", merchant.createAuthKey());
		}
		return config;
	});

	http.interceptors.response.use(async (raw) => {
		if (!isMidtransUrl(raw.config.baseURL)) {
			return raw;
		}

		const contentType = raw.headers?.["content-type"]?.toString();
		if (!contentType?.includes("application/json")) {
			return raw;
		}

		const rawData = raw?.data || {};
		const rawHeaders = raw.headers;
		const rawStatusCode =
			"status_code" in rawData
				? rawData.status_code
				: "status-code" in rawHeaders
					? rawHeaders["status-code"]
					: raw.status;
		const statusCode = HttpStatus.safeParse(rawStatusCode);
		if (statusCode.data?.success) {
			return raw;
		}

		throw HttpClientError.from(
			"Midtrans Client error. If this message show up it means you or client have done something wrong.",
			raw.config,
			raw.request,
			raw
		);
	});

	return http;
}
