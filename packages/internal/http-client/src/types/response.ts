import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

/**
 * Standard HTTP methods supported by the client.
 */
export type HttpMethod =
	"get" | "post" | "put" | "patch" | "delete" | "head" | "options";

/**
 * Standardized HTTP response structure.
 *
 * @template TData The response payload type.
 * @template TError The error payload type.
 */
export interface HttpResponse<TData = unknown, TError = unknown> {
	/**
	 * Indicates whether the HTTP status is within the successful 2xx range.
	 */
	ok: boolean;

	/**
	 * Response body payload returned by the server.
	 */
	data: TData;

	/**
	 * HTTP status code from the server response, or `undefined` if the network request failed before receiving a response.
	 */
	status?: number;

	/**
	 * HTTP status message associated with the status code.
	 */
	statusText?: string;

	/**
	 * HTTP response headers.
	 */
	headers: AxiosResponse<TData>["headers"];

	/**
	 * Request configuration utilized for request execution.
	 */
	config: InternalAxiosRequestConfig;

	/**
	 * Formatted error if the request failed or was processed by an error handler.
	 */
	error?: TError;
}
