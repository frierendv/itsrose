import { SystemError } from "../error-class";

/**
 * Options for reading and shaping an environment variable value.
 */
export type GetEnvOptions = {
	/** @default false */
	isRequired?: boolean;
	/**
	 * Determine if an empty string should be treated as a valid value.
	 * @default false
	 */
	allowEmpty?: boolean;
	/**
	 * Default value if the environment variable is not found.
	 */
	defaultValue?: string;
	/**
	 * Pre-process the resolved value before returning it.
	 */
	preprocess?: (value: string) => unknown;
	/**
	 * Custom message or message factory for when a required variable is missing.
	 */
	message?: string | ((key: string) => string);
};

/**
 * Infers the return type based on the provided environment options.
 */
export type ResolvedEnvValue<T extends GetEnvOptions> = T extends {
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
 * @template {keyof NodeJS.ProcessEnv} K
 * @template {GetEnvOptions} [T=GetEnvOptions]
 * @param {K} key Environment variable name.
 * @param {T} [options={} as T] Validation and preprocessing options.
 * @returns {ResolvedEnvValue<T>} The resolved environment value.
 */
export const getEnv = <
	K extends keyof NodeJS.ProcessEnv,
	T extends GetEnvOptions = GetEnvOptions,
>(
	key: K,
	options: T = {} as T
): ResolvedEnvValue<T> => {
	const { isRequired, allowEmpty, defaultValue, preprocess, message } =
		options;

	const rawValue = process.env[key];
	const isMissingOrEmpty = rawValue === undefined || rawValue === "";

	// Enforce requirement check immediately
	if (isRequired && isMissingOrEmpty) {
		const errorMessage =
			typeof message === "function"
				? message(String(key))
				: (message ?? `Missing environment variable: ${String(key)}`);

		throw new SystemError(errorMessage);
	}

	// If allowEmpty is true and the value is "", we keep the "" instead of falling back.
	const resolvedValue =
		isMissingOrEmpty && !(allowEmpty && rawValue === "")
			? defaultValue
			: rawValue;

	if (resolvedValue === undefined || (resolvedValue === "" && !allowEmpty)) {
		return undefined as ResolvedEnvValue<T>;
	}

	if (preprocess) {
		return preprocess(resolvedValue) as ResolvedEnvValue<T>;
	}

	return resolvedValue as ResolvedEnvValue<T>;
};
