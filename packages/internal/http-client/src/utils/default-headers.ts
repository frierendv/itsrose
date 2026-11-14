import type { AxiosInstance } from "axios";

/**
 * Minimal shape of an Axios header bag that exposes the `set`/`has` API.
 */
interface AxiosHeaderBag {
	set(name: string, value: string): void;
}

/**
 * Type guard detecting a header bag that exposes the Axios `set` API.
 *
 * @param value Candidate header bag.
 * @returns True when the value exposes a callable `set` method.
 */
function isAxiosHeaderBag(value: unknown): value is AxiosHeaderBag {
	return (
		typeof value === "object" &&
		value !== null &&
		"set" in value &&
		typeof value.set === "function"
	);
}

/**
 * Sets a default header on the client instance.
 *
 * The header is written to the instance's shared `common` bucket, so it is
 * merged into every request dispatched afterwards — including requests that
 * were configured before the header was set, because the defaults are read
 * when the request is dispatched.
 *
 * @param instance Target Axios instance to configure.
 * @param name Header name.
 * @param value Header value.
 */
export function applyDefaultHeader(
	instance: AxiosInstance,
	name: string,
	value: string
): void {
	const common = instance.defaults.headers.common;

	if (isAxiosHeaderBag(common)) {
		common.set(name, value);
		return;
	}

	common[name] = value;
}
