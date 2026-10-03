import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { HttpClientError } from "../errors";
import type { ErrorHandler, HttpExecutor, HttpResponse } from "../types";

/**
 * Creates an execution function that invokes the HTTP request,
 * formats success and failure payloads, and invokes optional error handlers.
 *
 * @param request Thunk returning an Axios response promise.
 * @param defaultThrowOnError Default policy for throwing on transport failures.
 * @returns Execution function returning an HttpResponse promise.
 */
export function createHttpExecutor<TData, TError = unknown>(
	request: () => Promise<AxiosResponse<TData>>,
	defaultThrowOnError = true
): HttpExecutor<TData, TError> {
	return async (
		errorHandler?: ErrorHandler<TError>
	): Promise<HttpResponse<TData, TError>> => {
		try {
			const response = await request();

			return {
				ok: response.status >= 200 && response.status < 300,
				status: response.status,
				statusText: response.statusText,
				data: response.data,
				headers: response.headers,
				config: response.config,
			};
		} catch (err: unknown) {
			const clientError = HttpClientError.from(err);
			const response = clientError.response;
			const config = (clientError.config ||
				response?.config ||
				{}) as InternalAxiosRequestConfig;

			// fire per request callback
			if (typeof clientError?.config?.onError === "function") {
				try {
					await clientError?.config?.onError(
						response?.data,
						clientError
					);
				} catch {
					// no-op
				}
			}
			let error: TError;
			if (typeof errorHandler === "function") {
				try {
					error = await errorHandler(response?.data, clientError);
				} catch (handlerErr: unknown) {
					error = handlerErr as TError;
				}
			} else {
				error = clientError as unknown as TError;
			}

			// If the server responded with an HTTP status code (e.g. 4xx, 5xx)
			if (response) {
				return {
					ok: false,
					data: response.data,
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
					config,
					error,
				};
			}

			// Transport, network, or client-side failure without server response
			const shouldThrow =
				clientError.config?.throwOnError ?? defaultThrowOnError;

			if (shouldThrow) {
				throw clientError;
			}

			return {
				ok: false,
				data: undefined as TData,
				status: undefined,
				statusText: "",
				headers: {},
				config,
				error,
			};
		}
	};
}
