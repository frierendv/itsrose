import type { z } from "zod/v4";

/**
 * Schema applied to an upstream payload.
 *
 * The schema is the contract the package publishes for the upstream it
 * talks to. Applying it at the seam is what turns an upstream drift — a
 * renamed field, a changed type — into an error instead of an `undefined`
 * in the middle of a payload the API then answers with.
 */
export type UpstreamSchema<T = unknown> = z.ZodType<T>;

/**
 * What the caller learns about a failed upstream call.
 */
export interface UpstreamErrorContext {
	/**
	 * Logical name of the upstream service, e.g. `elevenlabs`.
	 */
	service: string;

	/**
	 * HTTP status the upstream answered with, when it answered at all.
	 */
	status?: number;
}

/**
 * The message and the status a failed upstream call is reported with.
 */
export interface UpstreamErrorInfo {
	/**
	 * Human-readable message.
	 */
	message: string;

	/**
	 * Status our own API answers with. Defaults to `500`.
	 */
	statusCode?: number;
}

/**
 * Maps the error payload of an upstream onto the message a caller sees.
 *
 * This is where the vendor knowledge lives: the shape of an error body
 * differs per upstream, so every package that has a say in the message
 * provides a mapper.
 *
 * @param payload The raw, untrusted error body the upstream answered with.
 * @param context The upstream the call was made against.
 * @returns The message and the status the caller should see, or `undefined`
 * to let the client decide.
 */
export type UpstreamErrorMapper = (
	payload: unknown,
	context: UpstreamErrorContext
) => UpstreamErrorInfo | undefined;
