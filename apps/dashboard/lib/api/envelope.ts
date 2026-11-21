import { config } from "@/config";
import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                                Typed errors                                */
/* -------------------------------------------------------------------------- */

/** The diagnostic fields an `@itsrose/api-response` failure carries. */
export type ApiErrorDetails = {
	status?: number;
	code?: number;
	errors?: Record<string, unknown> | null;
	cause?: unknown;
};

/** The constructor shape {@link parseEnvelope} and {@link requestApi} throw. */
export type ApiErrorConstructor = new (
	message: string,
	details?: ApiErrorDetails
) => ApiError;

/**
 * A failed dashboard API call.
 *
 * It keeps the envelope's own diagnostics, so a call site can tell an expired
 * session (`status` 401) from a rejected payload (`code` plus `errors`)
 * without parsing the response a second time. A body that never reached the
 * routes still surfaces here, with the HTTP `status` but no envelope `code`.
 */
export class ApiError extends Error {
	readonly status?: number;
	readonly code?: number;
	readonly errors?: Record<string, unknown> | null;

	constructor(message: string, details: ApiErrorDetails = {}) {
		super(message, { cause: details.cause });
		this.name = "ApiError";
		this.status = details.status;
		this.code = details.code;
		this.errors = details.errors;
	}
}

/* -------------------------------------------------------------------------- */
/*                                  Envelopes                                 */
/* -------------------------------------------------------------------------- */

/** The free-form `meta` object every envelope carries. */
export const envelopeMetaSchema = z.record(z.string(), z.unknown()).default({});

/** The `@itsrose/api-response` failure envelope. */
export const failureEnvelopeSchema = z.object({
	ok: z.literal(false),
	code: z.number(),
	message: z.string(),
	data: z.null(),
	errors: z.record(z.string(), z.unknown()).nullish(),
	meta: envelopeMetaSchema,
});

/**
 * The `@itsrose/api-response` success envelope around one payload schema.
 *
 * Generic over the payload schema so the parsed `data` is as narrow as the
 * endpoint's contract rather than `unknown` every caller has to narrow again.
 */
export function successEnvelopeSchema<T extends z.ZodType>(data: T) {
	return z.object({
		ok: z.literal(true),
		code: z.number(),
		message: z.string(),
		data,
		errors: z.null(),
		meta: envelopeMetaSchema,
	});
}

/** The discriminated union of the success envelope and the failure envelope. */
export function envelopeSchema<T extends z.ZodType>(data: T) {
	return z.discriminatedUnion("ok", [
		successEnvelopeSchema(data),
		failureEnvelopeSchema,
	]);
}

/** The success arm of {@link ApiEnvelope}. */
export type ApiSuccessEnvelope<T extends z.ZodType = z.ZodUnknown> = z.infer<
	ReturnType<typeof successEnvelopeSchema<T>>
>;

/** The failure arm of {@link ApiEnvelope}. */
export type ApiFailureEnvelope = z.infer<typeof failureEnvelopeSchema>;

/** One parsed envelope, discriminated by `ok` and typed by its payload. */
export type ApiEnvelope<T extends z.ZodType = z.ZodUnknown> =
	ApiSuccessEnvelope<T> | ApiFailureEnvelope;

/* -------------------------------------------------------------------------- */
/*                                  Parsing                                   */
/* -------------------------------------------------------------------------- */

/** How a parser names the surface it is reading and which error it throws. */
export type ApiParseOptions = {
	/** The HTTP status, when a response is being read. */
	status?: number;
	/** Human name used in parser messages, e.g. `"asset API"`. */
	surface?: string;
	/** Error class thrown for an unreadable envelope or payload. */
	errorType?: ApiErrorConstructor;
};

const DEFAULT_SURFACE = "API";

function unexpectedResponseMessage(surface: string, status?: number): string {
	return `The ${surface} returned an unexpected response (HTTP ${status ?? "unknown"}).`;
}

function invalidPayloadMessage(surface: string): string {
	return `The ${surface} returned a payload that does not match its schema.`;
}

/** The envelope shape, with the payload left for the caller's schema. */
const envelopeShapeSchema = envelopeSchema(z.unknown());

/**
 * Parses an HTTP response body into the standard envelope and validates its
 * payload against `dataSchema`.
 *
 * A body that is not an envelope (an HTML error page, an empty body) is an
 * error of its own: it means the request never reached the API routes. A
 * success envelope whose payload breaks `dataSchema` means the dashboard and
 * the API disagree on the contract, which is surfaced separately so the two
 * failures are not confused.
 */
export function parseEnvelope<T extends z.ZodType>(
	dataSchema: T,
	payload: unknown,
	options: ApiParseOptions = {}
): ApiEnvelope<T> {
	const parsed = envelopeSchema(dataSchema).safeParse(payload);
	if (parsed.success) {
		return parsed.data;
	}

	const ErrorType = options.errorType ?? ApiError;

	// The typed parse failed; the shape parse tells an unreadable body apart
	// from a valid envelope whose payload drifted from the contract.
	const shape = envelopeShapeSchema.safeParse(payload);
	if (!shape.success) {
		throw new ErrorType(
			unexpectedResponseMessage(
				options.surface ?? DEFAULT_SURFACE,
				options.status
			),
			{ status: options.status, cause: shape.error }
		);
	}

	throw new ErrorType(
		invalidPayloadMessage(options.surface ?? DEFAULT_SURFACE),
		{
			status: options.status,
			cause: parsed.error,
		}
	);
}

/**
 * Validates the envelope `data` field against one of the payload schemas.
 *
 * A successful response whose payload does not match the schema means the
 * dashboard and the API disagree on the contract, which is a bug rather than
 * a user-facing failure — but it still has to be surfaced, not swallowed.
 */
export function parseData<T extends z.ZodType>(
	schema: T,
	data: unknown,
	options: ApiParseOptions = {}
): z.infer<T> {
	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		const ErrorType = options.errorType ?? ApiError;
		throw new ErrorType(
			invalidPayloadMessage(options.surface ?? DEFAULT_SURFACE),
			{ status: options.status, cause: parsed.error }
		);
	}
	return parsed.data;
}

/* -------------------------------------------------------------------------- */
/*                              Envelope requests                             */
/* -------------------------------------------------------------------------- */

/** Per-request overrides shared by every envelope-aware feature client. */
export type ApiRequestOptions = {
	/**
	 * Headers forwarded on the server so the session cookie travels with the
	 * call. Browser callers omit them and rely on `credentials: "include"`.
	 */
	headers?: HeadersInit;
	/** Human name used in parser messages, e.g. `"studio API"`. */
	surface?: string;
	/** Error class thrown for an unreadable envelope or payload. */
	errorType?: ApiErrorConstructor;
};

/** Builds an API URL from a path that starts with `/`. */
export function apiEndpoint(path: string): string {
	const origin = config.AUTH_BASE_URL.replace(/\/+$/, "");
	return `${origin}${path}`;
}

/**
 * Merges the request's own headers with the ones forwarded on the server.
 *
 * `init.headers` carries the body's `Content-Type` (a multipart boundary is
 * never written by hand); the forwarded headers carry the session cookie and
 * win over the request's own, exactly as a proxy forwards them. `Accept` is
 * always pinned to JSON because every route answers with an envelope.
 */
function buildHeaders(
	initHeaders: HeadersInit | undefined,
	forwarded: HeadersInit | undefined
): Headers {
	const headers = new Headers(initHeaders);
	new Headers(forwarded).forEach((value, key) => headers.set(key, value));
	headers.set("Accept", "application/json");
	return headers;
}

/** Builds a JSON body for the envelope client. */
export function jsonRequestInit(
	method: "POST" | "PUT" | "PATCH",
	body: unknown
): RequestInit {
	return {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}

/**
 * Reads the JSON body without assuming the response has one.
 *
 * A proxy or a crash can answer with HTML or an empty body; that is reported
 * as an unexpected envelope rather than a `SyntaxError`.
 */
async function readBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

/**
 * The shared envelope-aware transport of the dashboard feature clients.
 *
 * It sends the session cookie (`credentials: "include"`), forwards
 * {@link ApiRequestOptions.headers} for server prefetch, unwraps the
 * `@itsrose/api-response` envelope and validates the payload against
 * `dataSchema`. A failure envelope and an unreadable body both throw
 * {@link ApiError} (or the feature's subclass of it).
 */
export async function requestApi<T>(
	dataSchema: z.ZodType<T>,
	url: string,
	init: RequestInit,
	options: ApiRequestOptions = {}
): Promise<T> {
	const response = await fetch(url, {
		...init,
		credentials: "include",
		headers: buildHeaders(init.headers, options.headers),
	});

	const envelope = parseEnvelope(dataSchema, await readBody(response), {
		status: response.status,
		surface: options.surface,
		errorType: options.errorType,
	});

	if (!envelope.ok) {
		const ErrorType = options.errorType ?? ApiError;
		throw new ErrorType(envelope.message, {
			status: response.status,
			code: envelope.code,
			errors: envelope.errors ?? null,
		});
	}

	return envelope.data;
}
