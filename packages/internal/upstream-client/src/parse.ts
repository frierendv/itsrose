import type { z } from "zod/v4";
import { UpstreamApiError } from "./errors";
import type { UpstreamSchema } from "./types";

/**
 * Options of {@linkcode parseUpstreamPayload}.
 */
export interface ParseUpstreamOptions {
	/**
	 * Logical name of the upstream service, e.g. `tiktok`.
	 */
	service: string;

	/**
	 * What the payload is, e.g. `voices`. Used in the error message.
	 */
	label?: string;

	/**
	 * Status our own API answers with. Defaults to `500`.
	 */
	statusCode?: number;
}

/**
 * The issues of a failed validation, rendered as one readable line.
 *
 * @param error The validation failure.
 * @returns A description of what did not match.
 */
function describeIssues(error: z.ZodError): string {
	const described = error.issues
		.slice(0, 3)
		.map((issue) => {
			const path = issue.path.map((segment) => String(segment)).join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.filter(Boolean);

	if (described.length === 0) {
		return "the payload did not match the published schema";
	}

	return described.join("; ");
}

/**
 * Applies a published schema to an upstream payload.
 *
 * A payload that does not match is an upstream drift, and it is raised as
 * the shared {@linkcode UpstreamApiError} rather than returned as a
 * half-empty object.
 *
 * @param schema The schema the package publishes for this payload.
 * @param payload The raw, untrusted upstream payload.
 * @param options The upstream the payload came from.
 * @returns The validated payload.
 * @throws {UpstreamApiError} When the payload does not match the schema.
 */
export function parseUpstreamPayload<T>(
	schema: UpstreamSchema<T>,
	payload: unknown,
	options: ParseUpstreamOptions
): T {
	const result = schema.safeParse(payload);

	if (result.success) {
		return result.data;
	}

	const subject = options.label
		? `${options.service} ${options.label}`
		: `${options.service} response`;

	throw new UpstreamApiError(
		`The ${subject} did not match the published schema: ${describeIssues(result.error)}`,
		options.statusCode ?? 500,
		{
			service: options.service,
			details: payload,
			cause: result.error,
			isSchemaMismatch: true,
		}
	);
}
