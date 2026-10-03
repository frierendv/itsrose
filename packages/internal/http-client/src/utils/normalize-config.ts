import type { HttpRequestConfig } from "../types";

/**
 * Normalizes request arguments that can be passed either as a single config object
 * or as a URL string with an optional config object.
 *
 * @param urlOrConfig A URL string or a complete request configuration object.
 * @param config Optional additional request configuration when first argument is a URL.
 * @returns Unified request configuration object.
 */
export function normalizeRequestConfig(
	urlOrConfig: string | HttpRequestConfig,
	config?: HttpRequestConfig
): HttpRequestConfig {
	if (typeof urlOrConfig === "string") {
		return {
			...config,
			url: urlOrConfig,
		};
	}

	if (config) {
		return {
			...urlOrConfig,
			...config,
		};
	}

	return urlOrConfig ?? {};
}
