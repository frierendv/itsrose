import type {
	HttpClientInstance,
	HttpConfig,
	HttpRequestConfig,
} from "../types";
import { normalizeRequestConfig } from "../utils/normalize-config";
import { HttpClient } from "./client";

/**
 * Creates a configured HTTP client instance.
 *
 * @template T Client configuration type.
 * @param config Optional client configuration options.
 * @returns A callable HTTP client proxy.
 *
 * @example
 * ```ts
 * const client = createHttpClient({ baseURL: "https://api.example.com" });
 * const res = await client("/endpoint");
 * const res = await client.get("/endpoint");
 * ```
 */
export function createHttpClient<T extends HttpConfig = HttpConfig>(
	config?: T
): HttpClientInstance<T> {
	const client = new HttpClient<T>(config);

	const callable = function <TData = unknown>(
		configOrUrl: string | HttpRequestConfig,
		reqConfig?: HttpRequestConfig
	) {
		const normalized = normalizeRequestConfig(configOrUrl, reqConfig);
		return client.request<TData>(normalized);
	};

	return new Proxy(callable, {
		get(target, prop, receiver) {
			if (Object.prototype.hasOwnProperty.call(target, prop)) {
				return Reflect.get(target, prop, receiver);
			}

			if (prop === "create") {
				return <C extends HttpConfig>(childConfig?: C) =>
					createHttpClient<C>(childConfig);
			}

			if (prop === "extend") {
				return <C extends HttpConfig>(childConfig?: C) => {
					const extended = client.extend(childConfig);
					return createHttpClient<C>(extended.config as C);
				};
			}

			if (prop in client) {
				const value = client[prop as keyof HttpClient<T>];
				return typeof value === "function" ? value.bind(client) : value;
			}

			return Reflect.get(target, prop, receiver);
		},
		has(target, prop) {
			return (
				Object.prototype.hasOwnProperty.call(target, prop) ||
				prop in client ||
				prop === "create" ||
				prop === "extend"
			);
		},
		set(target, prop, value) {
			return Reflect.set(target, prop, value);
		},
		defineProperty(target, prop, descriptor) {
			return Reflect.defineProperty(target, prop, descriptor);
		},
		getOwnPropertyDescriptor(target, prop) {
			if (Object.prototype.hasOwnProperty.call(target, prop)) {
				return Reflect.getOwnPropertyDescriptor(target, prop);
			}
			if (prop in client || prop === "create" || prop === "extend") {
				const value =
					prop in client
						? client[prop as keyof HttpClient<T>]
						: undefined;
				return {
					configurable: true,
					enumerable: true,
					writable: true,
					value:
						typeof value === "function"
							? value.bind(client)
							: value,
				};
			}
			return undefined;
		},
	}) as HttpClientInstance<T>;
}
