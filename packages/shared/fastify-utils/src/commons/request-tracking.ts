import type { IncomingMessage } from "node:http";
import hyperid from "hyperid";

const instance = hyperid();

/**
 * Options for generating a request tracking identifier.
 */
export interface IRequestTrackingIdOptions {
	/**
	 * A prefix to add to the generated request ID.
	 */
	prefix?: string;
	/**
	 * Header name to check for an existing request ID. Defaults to "x-request-id" and "x-correlation-id".
	 */
	headers?: string[];
}

const DEFAULT_HEADERS = ["x-request-id", "x-correlation-id", "x-trace-id"];

/**
 * Generate a request tracking identifier for Fastify's `genReqId` hook.
 *
 * Existing request IDs are reused when present; otherwise a new ID is generated.
 *
 * @param request - Incoming request.
 * @param options - Header precedence and prefix options.
 * @returns A request tracking ID.
 */
export function generateRequestTrackingId(
	request: IncomingMessage,
	options?: IRequestTrackingIdOptions
): string {
	const headerNames = options?.headers ?? DEFAULT_HEADERS;
	for (const headerName of headerNames) {
		const existingId = request.headers[headerName] as string | undefined;
		if (existingId) {
			return existingId;
		}
	}
	const newId = instance();
	if (options?.prefix) {
		return `${options.prefix}_${newId}`;
	}
	return newId;
}
