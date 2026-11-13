import { USER_AGENT } from "@itsrose/system";
import type { AxiosInstance } from "axios";

/**
 * Minimal shape of an Axios header bag that exposes the `set`/`has` API.
 */
interface AxiosHeaderBag {
	set(name: string, value: string): void;
	has?(name: string): boolean;
}

/**
 * Type guard detecting a header bag that exposes the Axios `set`/`has` API.
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
 * Ensures a User-Agent header is set on the Axios instance defaults if not already present.
 *
 * @param instance Target Axios instance to configure.
 * @param customUserAgent Optional User-Agent override string.
 */
export function applyDefaultUserAgent(
	instance: AxiosInstance,
	customUserAgent?: string
): void {
	const userAgent = customUserAgent ?? USER_AGENT;
	const headers = instance.defaults.headers;

	if (isAxiosHeaderBag(headers)) {
		if (typeof headers.has === "function" && !headers.has("User-Agent")) {
			headers.set("User-Agent", userAgent);
		}
	} else if (headers?.common) {
		headers.common["User-Agent"] ??= userAgent;
	}
}
