export type ErrorLike = Error & Record<string, unknown>;

/**
 * Description placeholder
 *
 * @param {unknown} value
 * @returns {value is ErrorLike}
 */
export const isErrorLike = (value: unknown): value is ErrorLike => {
	if (value instanceof Error) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	return typeof (value as { stack?: unknown }).stack === "string";
};

export const serializeError = (value: unknown): unknown => {
	if (!isErrorLike(value)) {
		return value;
	}

	const error = value as ErrorLike;
	const base = {
		name: error.name,
		message: error.message,
		stack: error.stack,
	};

	return Object.keys(error).reduce<Record<string, unknown>>((acc, key) => {
		if (key === "name" || key === "message" || key === "stack") {
			return acc;
		}
		acc[key] = error[key];
		return acc;
	}, base);
};
