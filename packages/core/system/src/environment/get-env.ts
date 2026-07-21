import { SystemError } from "../error-class";

/**
 * Options for reading and shaping an environment variable value.
 */
export type GetEnvOptions = {
	/** @default false */
	isRequired?: boolean;
	/**
	 * Determine should allow empty value.
	 *
	 * @type {?boolean}
	 * @default false
	 */
	allowEmpty?: boolean;
	/**
	 * Default value if env[name] not found.
	 *
	 * @type {?string}
	 */
	defaultValue?: string;
	/**
	 * Pre-process the env[name] value before passing it.
	 *
	 * @type {?(value: string) => unknown}
	 */
	preprocess?: (value: string) => unknown;
	/**
	 * Custom message for error when failed to read env[name]
	 *
	 * @type {?(string | ((key: string) => string))}
	 */
	message?: string | ((key: string) => string);
};

/**
 * Infers the return type based on the provided environment options.
 */
export type ReadEnvReturnType<T extends GetEnvOptions> = T extends {
	preprocess: (value: string) => infer R;
}
	? R
	: T extends { isRequired: true }
		? string
		: T extends { allowEmpty: true }
			? string | undefined
			: T extends { defaultValue: string }
				? string
				: string | undefined;

/**
 * Read an environment variable and optionally validate or transform it.
 *
 * @param key - Environment variable name.
 * @param options - Validation and preprocessing options.
 * @returns The resolved environment value.
 */
export const getEnv = <
	K extends keyof NodeJS.ProcessEnv,
	T extends GetEnvOptions,
>(
	key: K,
	options?: T
): ReadEnvReturnType<T> => {
	const value = process.env[key];

	if (options?.isRequired && (!value || value === "")) {
		const message = options.message
			? typeof options.message === "function"
				? options.message(String(key))
				: options.message
			: `Missing environment variable: ${key}`;
		throw new SystemError(message);
	}

	if (options?.allowEmpty && value === "") {
		return undefined as ReadEnvReturnType<T>;
	}

	if (value === undefined || value === "") {
		if (options?.defaultValue !== undefined) {
			if (options?.preprocess) {
				return options.preprocess(
					options.defaultValue
				) as ReadEnvReturnType<T>;
			}

			return options.defaultValue as ReadEnvReturnType<T>;
		}

		if (options?.allowEmpty) {
			return undefined as ReadEnvReturnType<T>;
		}

		return undefined as ReadEnvReturnType<T>;
	}

	if (options?.preprocess) {
		return options.preprocess(value) as ReadEnvReturnType<T>;
	}

	return value as ReadEnvReturnType<T>;
};
