import { USER_AGENT } from "@itsrose/system";
import type { AxiosInstance } from "axios";

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
	const headers = instance.defaults.headers as any;

	if (headers && typeof headers.set === "function") {
		if (typeof headers.has === "function" && !headers.has("User-Agent")) {
			headers.set("User-Agent", userAgent);
		}
	} else if (headers?.common) {
		headers.common["User-Agent"] ??= userAgent;
	}
}
