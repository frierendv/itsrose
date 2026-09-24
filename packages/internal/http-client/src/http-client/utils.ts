import type { IRequestConfig } from "../types";

/**
 * Normalizes request arguments that can be passed either as a single config object
 * or as a URL string with an optional config object.
 *
 * @param urlOrConfig URL string or request configuration object.
 * @param config Optional additional request configuration.
 * @returns Unified IRequestConfig object.
 */
export const normalizeRequestConfig = <D = any>(
	urlOrConfig: string | IRequestConfig<D>,
	config?: IRequestConfig<D>
): IRequestConfig<D> => {
	if (typeof urlOrConfig === "string") {
		return {
			...config,
			url: urlOrConfig,
		} as IRequestConfig<D>;
	}

	if (config) {
		return {
			...urlOrConfig,
			...config,
		};
	}

	return urlOrConfig ?? {};
};
