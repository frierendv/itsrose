import { createHttpClient } from "./core";

/**
 * Pre-configured default HTTP client instance with shared User-Agent and retry defaults.
 *
 * @example
 * ```ts
 * type Data = { hello: string }
 * const { data, error } = await fetcher.get<Data>("https://example.com", {
 * 	adapter: "fetch",
 * 	throwOnError: false,
 * 	env: {
 * 		fetch,
 * 	},
 * });
 * if (error) {
 * 	console.debug(error) // "error"
 * 	return;
 * }
 * console.debug(data.hello); // "world"
 * ```
 */
export const fetcher = createHttpClient({ throwOnError: true });
