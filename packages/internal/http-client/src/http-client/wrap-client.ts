import type { AxiosInstance } from "axios";
import { createExecutor, RequestBuilder } from "../request";
import type { IHttpClientMethods, IRequestConfig } from "../types";
import { normalizeRequestConfig } from "./utils";

/**
 * Wraps an Axios instance with fluent RequestBuilder methods.
 *
 * @param instance The Axios instance to wrap.
 * @returns Object containing all wrapped HTTP methods.
 */
export const createWrappedClient = (
	instance: AxiosInstance
): IHttpClientMethods => {
	const request = <TData = unknown, D = any>(
		urlOrConfig: string | IRequestConfig<D>,
		config?: IRequestConfig<D>
	): RequestBuilder<TData> => {
		const normalized = normalizeRequestConfig(urlOrConfig, config);
		return new RequestBuilder<TData>(
			createExecutor(() => instance.request<TData>(normalized))
		);
	};

	return {
		request,

		get: <TData = unknown, D = any>(
			url: string,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.get<TData>(url, config))
			),

		delete: <TData = unknown, D = any>(
			url: string,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.delete<TData>(url, config))
			),

		head: <TData = unknown, D = any>(
			url: string,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.head<TData>(url, config))
			),

		options: <TData = unknown, D = any>(
			url: string,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.options<TData>(url, config))
			),

		post: <TData = unknown, D = any>(
			url: string,
			data?: D,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.post<TData>(url, data, config))
			),

		put: <TData = unknown, D = any>(
			url: string,
			data?: D,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.put<TData>(url, data, config))
			),

		patch: <TData = unknown, D = any>(
			url: string,
			data?: D,
			config?: IRequestConfig<D>
		): RequestBuilder<TData> =>
			new RequestBuilder<TData>(
				createExecutor(() => instance.patch<TData>(url, data, config))
			),
	};
};
