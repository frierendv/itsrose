import type { AxiosResponse } from "axios";
import type { IHttpResponse, OnError } from "../types";

/**
 *
 * @param request
 * @returns
 */
export const createExecutor =
	<T>(request: () => Promise<AxiosResponse<T>>) =>
	async (handler?: OnError<any>): Promise<IHttpResponse<T, any>> => {
		try {
			const response = await request();

			return {
				data: response.data,
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
			};
		} catch (err: any) {
			const response = err?.response;

			const error = handler
				? await handler(response?.data, response?.status)
				: err;

			return {
				...response,
				error,
			};
		}
	};
