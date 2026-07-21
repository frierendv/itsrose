export function resolvePath(
	path: string,
	pathParams?: Record<string, unknown>
) {
	if (!pathParams) {
		return path;
	}
	return path.replace(/\{(\w+)\}/g, (_, key) => {
		if (!(key in pathParams)) {
			throw new Error(`Missing path param: "${key}"`);
		}
		return String(pathParams[key]);
	});
}

function buildFormContainer(
	data: Record<string, any>,
	container: FormData | URLSearchParams
) {
	Object.entries(data).forEach(([key, value]) => {
		if (value !== undefined) {
			const formattedValue =
				container instanceof FormData && value instanceof Blob
					? value
					: typeof value === "object" && value !== null
						? JSON.stringify(value)
						: String(value);
			container.append(key, formattedValue as any);
		}
	});
	return container;
}

export function parseOptions(path: string, options: any = {}) {
	const { pathParams, params, data } = options;
	const url = resolvePath(path, pathParams);

	const config = { url, data, params };

	if (options.formData) {
		config.data =
			typeof options.formHandler === "function"
				? options.formHandler(options.formData)
				: buildFormContainer(options.formData, new FormData());
	}
	if (options.form) {
		config.data =
			typeof options.formHandler === "function"
				? options.formHandler(options.form)
				: buildFormContainer(options.form, new URLSearchParams());
	}
	return config;
}
