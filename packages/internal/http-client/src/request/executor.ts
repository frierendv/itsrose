import type { AxiosResponse } from "axios";
import type { IHttpResponse, OnError } from "../types";

/**
 * Creates an execution function that invokes the HTTP request,
 * formats success and failure payloads, and invokes optional error handlers.
 *
 * @param request Thunk returning an Axios response promise.
 * @returns Execution function returning an IHttpResponse promise.
 */
export const createExecutor =
	<TData>(request: () => Promise<AxiosResponse<TData>>) =>
	async <TError = unknown>(
		handler?: OnError<TError>
	): Promise<IHttpResponse<TData, TError>> => {
		try {
			const response = await request();

			return {
				data: response.data,
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
				ok: response.status >= 200 && response.status < 300,
				config: response.config,
				request: response.request,
			};
		} catch (err: unknown) {
			const errObj = (
				err && typeof err === "object" ? err : {}
			) as Record<string, any>;
			const response = errObj.response as AxiosResponse<any> | undefined;
			const status = response?.status;
			const data = response?.data;

			let error: TError;
			if (handler) {
				try {
					error = await handler(data, status, err);
				} catch (handlerErr: unknown) {
					error = handlerErr as TError;
				}
			} else {
				error = err as TError;
			}

			if (response) {
				return {
					...response,
					data: response.data,
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
					error,
					ok: false,
				};
			}

			// not reached
			return {
				data: undefined as unknown as TData,
				status: undefined,
				statusText: "",
				headers: {},
				error,
				ok: false,
			};
		}
	};
