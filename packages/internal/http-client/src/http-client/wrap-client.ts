import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { createExecutor, RequestBuilder } from "../request";

export const createWrappedClient = (instance: AxiosInstance) => ({
	request: <TData>(config: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.request<TData>(config))
		),

	get: <TData>(url: string, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.get<TData>(url, config))
		),

	delete: <TData>(url: string, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.delete<TData>(url, config))
		),

	head: <TData>(url: string, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.head<TData>(url, config))
		),

	options: <TData>(url: string, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.options<TData>(url, config))
		),

	post: <TData>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.post<TData>(url, data, config))
		),

	put: <TData>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.put<TData>(url, data, config))
		),

	patch: <TData>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
		new RequestBuilder<TData>(
			createExecutor(() => instance.patch<TData>(url, data, config))
		),
});
