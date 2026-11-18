import {
	UpstreamApiError,
	type UpstreamRequestConfig,
} from "@itsrose/upstream-client";
import { z } from "zod/v4";
import { httpClient } from "./client";
import { mapPixverseError } from "./errors";

/**
 * The business code PixVerse answers with when an operation succeeded.
 */
export const PIXVERSE_SUCCESS_CODE = 0;

/**
 * The envelope of any PixVerse response, as this package reads it first.
 */
const EnvelopeSchema = z.object({
	ErrCode: z.int(),
	ErrMsg: z.string(),
	Resp: z.unknown(),
	Error: z.unknown().optional(),
});

type Envelope = z.infer<typeof EnvelopeSchema>;

/**
 * A request whose `Resp` payload has to be validated against a schema.
 */
export interface PixverseSendConfig<T> extends Omit<
	UpstreamRequestConfig,
	"schema"
> {
	/** Schema of the `Resp` payload. */
	schema: z.ZodType<T>;

	/**
	 * What the payload is, used in the failure message when it does not
	 * match the schema.
	 */
	label?: string;
}

/**
 * Calls a PixVerse endpoint and returns the validated `Resp` payload.
 *
 * PixVerse answers `HTTP 200` for a failed operation, so success is decided
 * by `ErrCode` and not by the status: a non-zero code is raised as the
 * shared {@linkcode UpstreamApiError}, mapped exactly as a refused HTTP call
 * would be.
 *
 * @param config The request and the schema of its `Resp` payload.
 * @returns The validated payload.
 * @throws {UpstreamApiError} When the call failed, the business code was
 * not `0`, or the payload did not match the schema.
 */
export async function requestPixverse<T>(
	config: PixverseSendConfig<T>
): Promise<T> {
	const { schema, label, ...request } = config;

	const envelope = await httpClient.send<Envelope>({
		...request,
		schema: EnvelopeSchema,
	});

	if (envelope.ErrCode !== PIXVERSE_SUCCESS_CODE) {
		throw toBusinessFailure(envelope);
	}

	return parsePayload(schema, envelope.Resp, label);
}

/**
 * Applies the published schema to the payload of a successful response.
 *
 * A payload that does not match is an upstream drift, and it is reported as
 * such rather than returned half-empty.
 *
 * @param schema Schema the package publishes for this payload.
 * @param payload The unwrapped `Resp` payload.
 * @param label What the payload is, when the caller named it.
 * @returns The validated payload.
 * @throws {UpstreamApiError} When the payload does not match the schema.
 */
function parsePayload<T>(
	schema: z.ZodType<T>,
	payload: unknown,
	label?: string
): T {
	const result = schema.safeParse(payload);

	if (result.success) {
		return result.data;
	}

	const subject = label ? `pixverse ${label}` : "pixverse response";
	const issues = result.error.issues
		.slice(0, 3)
		.map((issue) => {
			const path = issue.path.map(String).join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("; ");

	throw new UpstreamApiError(
		`The ${subject} did not match the published schema: ${issues || "the payload did not match"}`,
		500,
		{
			service: "pixverse",
			details: payload,
			cause: result.error,
			isSchemaMismatch: true,
		}
	);
}

/**
 * Builds the failure a business code that is not `0` is raised as.
 *
 * @param envelope The envelope PixVerse answered with.
 * @returns The failure to raise.
 */
function toBusinessFailure(envelope: Envelope): UpstreamApiError {
	const mapped = mapPixverseError(envelope, { service: "pixverse" });

	return new UpstreamApiError(
		mapped?.message ??
			`PixVerse answered with error code ${envelope.ErrCode}.`,
		mapped?.statusCode ?? 500,
		{
			service: "pixverse",
			details: envelope,
		}
	);
}
