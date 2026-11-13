import { z } from "zod/v4";

/**
 * The single Midtrans error model.
 *
 * Every error the client can receive — a Core API body, a legacy
 * `error_messages` envelope, an HTTP 401 body, or a transport failure with no
 * server response at all — is classified into exactly one {@link MidtransErrorKind}
 * by this module. The runtime type is derived from the schemas below
 * (`z.infer`), so the schema and the runtime can never describe two different
 * error taxonomies.
 *
 * ## Why this module replaces the previous parallel model
 *
 * The package used to ship two error taxonomies: a hand-written
 * `MidtransApiError` interface used by the client, and a separate Zod union
 * (`ApiErrorSchema` and friends) exported from `@itsrose/midtrans/schema`.
 * Nothing in `src/` imported the Zod copy, and the two disagreed: a
 * subscription-shaped body was `kind: "core"` at runtime but matched
 * `SubscriptionErrorSchema` in the union, and the union required a `400`–`599`
 * status while the runtime fell back to the HTTP status and then to `500`.
 *
 * The Zod union is now the implementation:
 *
 * - {@link MidtransApiErrorSchema} is the normalized model (the discriminated
 *   union of the four error kinds) and the single source of the
 *   {@link MidtransApiError} type.
 * - {@link ApiErrorSchema} and the per-kind schemas consume a *raw* upstream
 *   payload and produce the normalized error. They are total: parsing any
 *   input yields exactly one kind.
 * - The status normalization rule (payload status → HTTP status → `500`) and
 *   the classification rules live here, next to the schemas, instead of
 *   beside them in the transport layer.
 */

/** Message used when neither the payload nor the transport provides one. */
const DEFAULT_ERROR_MESSAGE = "Unknown Midtrans API error";

/** Status used when neither the payload nor the transport provides a valid one. */
const FALLBACK_ERROR_STATUS = 500;

/**
 * Fields shared by every normalized error.
 *
 * Kind-specific fields stay optional on every variant: consumers read them
 * without narrowing the `kind` first, exactly like the historical
 * `MidtransApiError` interface did.
 */
const ErrorBaseShape = {
	/** HTTP-style status code, normalized to the `400`–`599` range. */
	status_code: z.number().int().min(400).max(599),
	/** Original Midtrans `status_code` value, if present. */
	status_code_raw: z.string().optional(),
	/** Human-readable message. */
	status_message: z.string(),
	/** Validation messages returned by the API. */
	validation_messages: z.array(z.string()).optional(),
	/** Legacy error message list returned by Snap/Invoice/Payment Link. */
	error_messages: z.array(z.string()).optional(),
	/** Midtrans error identifier, when present. */
	id: z.string().optional(),
	/** Original JSON response body, when it was an object. */
	details: z.record(z.string(), z.unknown()).optional(),
} as const;

/**
 * Core-style error: `status_code` + `status_message`.
 *
 * Subscription API errors share this shape (`status_message` without a
 * `status_code` is still a core error).
 */
const CoreErrorVariant = z.object({
	...ErrorBaseShape,
	kind: z.literal("core"),
});

/** Legacy envelope: `{ error_messages: string[] }` (Snap, Invoice, Payment Link). */
const LegacyErrorVariant = z.object({
	...ErrorBaseShape,
	kind: z.literal("legacy"),
	error_messages: z.array(z.string()),
});

/** HTTP 401 body: `{ error: "Unauthorized" }`. */
const UnauthorizedErrorVariant = z.object({
	...ErrorBaseShape,
	kind: z.literal("unauthorized"),
});

/** Transport failure: empty, plain-text, or network-level failure. */
const TransportErrorVariant = z.object({
	...ErrorBaseShape,
	kind: z.literal("transport"),
});

/**
 * The normalized Midtrans error model.
 *
 * This is the schema the {@link MidtransApiError} type is inferred from.
 */
export const MidtransApiErrorSchema = z.discriminatedUnion("kind", [
	CoreErrorVariant,
	LegacyErrorVariant,
	UnauthorizedErrorVariant,
	TransportErrorVariant,
]);

/**
 * Normalized Midtrans API error.
 *
 * The shape keeps the historical error fields (`status_code`,
 * `status_code_raw`, `status_message`, `error_messages`,
 * `validation_messages`) and adds the `kind` discriminator and `details`.
 */
export type MidtransApiError = z.infer<typeof MidtransApiErrorSchema>;

/** Category of a normalized Midtrans error. */
export type MidtransErrorKind = MidtransApiError["kind"];

type CoreErrorCandidate = z.input<typeof CoreErrorVariant>;
type LegacyErrorCandidate = z.input<typeof LegacyErrorVariant>;
type UnauthorizedErrorCandidate = z.input<typeof UnauthorizedErrorVariant>;
type TransportErrorCandidate = z.input<typeof TransportErrorVariant>;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the original `status_code` value returned by Midtrans.
 *
 * Midtrans returns the code as a numeric string; integers are stringified so
 * the raw value is always comparable with the original payload.
 */
function readStatusCodeRaw(body: Record<string, unknown>): string | undefined {
	const value = body.status_code;

	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}
	if (typeof value === "number" && Number.isInteger(value)) {
		return String(value);
	}
	return undefined;
}

/**
 * Converts a status-like value into an HTTP error status, when it is one.
 */
function toErrorStatus(value: unknown): number | undefined {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value)
				: Number.NaN;

	if (!Number.isInteger(numeric) || numeric < 400 || numeric > 599) {
		return undefined;
	}
	return numeric;
}

/**
 * Normalizes the status of an error.
 *
 * The payload status wins, then the HTTP status of the failed response, and
 * `500` closes the chain. This rule lives in the model on purpose: it used to
 * sit in the transport layer, next to the schema that was supposed to
 * describe the very same errors.
 */
function resolveStatus(
	payloadStatus: unknown,
	httpStatus: number | undefined
): number {
	return (
		toErrorStatus(payloadStatus) ??
		toErrorStatus(httpStatus) ??
		FALLBACK_ERROR_STATUS
	);
}

/**
 * Reads a human-readable message from the payload.
 */
function resolveMessage(
	body: Record<string, unknown>,
	httpMessage: string | undefined
): string {
	const value = body.status_message;

	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	return httpMessage ?? DEFAULT_ERROR_MESSAGE;
}

/**
 * Reads the `error` message of an unauthorized body.
 */
function readUnauthorizedMessage(
	body: Record<string, unknown>
): string | undefined {
	const value = body.error;

	if (typeof value === "string" && value.length > 0) {
		return value;
	}
	return undefined;
}

/**
 * Coerces a value into a list of strings, mirroring the historical behavior.
 */
function readStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	return value.map((item) => String(item));
}

/**
 * Whether the payload is a legacy `error_messages` envelope.
 *
 * Legacy bodies win over every other shape: they are the most specific
 * envelope Midtrans sends.
 */
function isLegacyPayload(body: Record<string, unknown>): boolean {
	return Array.isArray(body.error_messages);
}

/**
 * Whether the payload is an HTTP 401 body.
 */
function isUnauthorizedPayload(body: Record<string, unknown>): boolean {
	return readUnauthorizedMessage(body) !== undefined;
}

/**
 * Whether the payload carries a Midtrans status code.
 */
function hasStatusCode(body: Record<string, unknown>): boolean {
	return readStatusCodeRaw(body) !== undefined;
}

/**
 * Whether the payload carries a Midtrans status message.
 */
function hasStatusMessage(body: Record<string, unknown>): boolean {
	return typeof body.status_message === "string";
}

function classifyLegacy(
	value: unknown,
	httpStatus: number | undefined,
	httpMessage: string | undefined
): LegacyErrorCandidate | undefined {
	if (!isRecord(value) || !isLegacyPayload(value)) {
		return undefined;
	}

	return {
		kind: "legacy",
		status_code: resolveStatus(value.status_code, httpStatus),
		status_code_raw: readStatusCodeRaw(value),
		status_message: resolveMessage(value, httpMessage),
		error_messages: readStringArray(value.error_messages) ?? [],
		details: value,
	};
}

function classifyUnauthorized(
	value: unknown,
	httpStatus: number | undefined
): UnauthorizedErrorCandidate | undefined {
	if (!isRecord(value) || isLegacyPayload(value)) {
		return undefined;
	}

	const message = readUnauthorizedMessage(value);
	if (message === undefined) {
		return undefined;
	}

	return {
		kind: "unauthorized",
		status_code: resolveStatus(value.status_code, httpStatus),
		status_code_raw: readStatusCodeRaw(value),
		status_message: message,
		details: value,
	};
}

function classifyCore(
	value: unknown,
	httpStatus: number | undefined,
	httpMessage: string | undefined
): CoreErrorCandidate | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	if (isLegacyPayload(value) || isUnauthorizedPayload(value)) {
		return undefined;
	}
	if (!hasStatusCode(value) && !hasStatusMessage(value)) {
		return undefined;
	}

	return {
		kind: "core",
		status_code: resolveStatus(value.status_code, httpStatus),
		status_code_raw: readStatusCodeRaw(value),
		status_message: resolveMessage(value, httpMessage),
		validation_messages: readStringArray(value.validation_messages),
		id: typeof value.id === "string" ? value.id : undefined,
		details: value,
	};
}

/**
 * Classifies a payload that is not a known upstream error body.
 *
 * The transport failure is the catch-all kind: it covers empty bodies,
 * plain-text answers and network-level failures, so the model stays total.
 */
function classifyTransport(
	value: unknown,
	httpStatus: number | undefined,
	httpMessage: string | undefined
): TransportErrorCandidate {
	return {
		kind: "transport",
		status_code: resolveStatus(undefined, httpStatus),
		status_message: httpMessage ?? DEFAULT_ERROR_MESSAGE,
		details: isRecord(value) ? value : undefined,
	};
}

/**
 * Builds the error model for a given transport outcome.
 *
 * The HTTP status and message of the failed response are part of the model:
 * they are the fallbacks of the status and message normalization rules, so
 * they are captured here instead of being resolved beside the schema.
 *
 * @param httpStatus HTTP status of the failed response, when there was one.
 * @param httpMessage Message of the failed response, when there was one.
 */
export function createMidtransErrorModel(
	httpStatus?: number,
	httpMessage?: string
) {
	const legacy = z.preprocess(
		(value) => classifyLegacy(value, httpStatus, httpMessage),
		LegacyErrorVariant
	);
	const unauthorized = z.preprocess(
		(value) => classifyUnauthorized(value, httpStatus),
		UnauthorizedErrorVariant
	);
	const core = z.preprocess(
		(value) => classifyCore(value, httpStatus, httpMessage),
		CoreErrorVariant
	);
	const transport = z.preprocess(
		(value) => classifyTransport(value, httpStatus, httpMessage),
		TransportErrorVariant
	);

	return {
		/**
		 * Total union: parsing any input yields exactly one error kind.
		 *
		 * The order is the classification precedence: legacy, unauthorized,
		 * core, transport.
		 */
		apiError: z.union([legacy, unauthorized, core, transport]),
		legacy,
		unauthorized,
		core,
		transport,
	};
}

const defaultModel = createMidtransErrorModel();

/**
 * Total union of every error the client can receive.
 *
 * Parses a raw upstream payload (or any other input) into a normalized
 * {@link MidtransApiError}. The union never rejects: an unknown payload
 * becomes a `transport` error.
 */
export const ApiErrorSchema = defaultModel.apiError;

/** Schema of a legacy `error_messages` envelope, normalized to `kind: "legacy"`. */
export const DefaultErrorSchema = defaultModel.legacy;

/** Schema of an HTTP 401 body, normalized to `kind: "unauthorized"`. */
export const UnauthorizedErrorSchema = defaultModel.unauthorized;

/** Schema of a Core-style body, normalized to `kind: "core"`. */
export const CoreErrorSchema = defaultModel.core;

/** Schema of a transport failure, normalized to `kind: "transport"`. */
export const TransportErrorSchema = defaultModel.transport;

/** Normalized legacy error. */
export type DefaultError = z.infer<typeof DefaultErrorSchema>;

/** Normalized unauthorized error. */
export type UnauthorizedError = z.infer<typeof UnauthorizedErrorSchema>;

/** Normalized core error. */
export type CoreError = z.infer<typeof CoreErrorSchema>;

/** Normalized transport error. */
export type TransportError = z.infer<typeof TransportErrorSchema>;
