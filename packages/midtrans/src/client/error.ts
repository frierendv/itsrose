import type { ErrorHandler, HttpClientError } from "@itsrose/http-client";

/**
 * Category of a normalized Midtrans error.
 *
 * - `core`: Midtrans Core-style error (`status_code` + `status_message`).
 * - `legacy`: `{ error_messages: string[] }` (Snap, Invoice, Payment Link).
 * - `unauthorized`: `{ error: "Unauthorized" }` (HTTP 401).
 * - `transport`: empty, plain-text, or network-level failure.
 */
export type MidtransErrorKind =
	"core" | "legacy" | "unauthorized" | "transport";

/**
 * Normalized Midtrans API error exposed through `HttpResponse.error`.
 *
 * The shape stays compatible with the historical error fields
 * (`status_code`, `status_code_raw`, `status_message`, `error_messages`,
 * `validation_messages`) while adding `kind` and `details`.
 */
export interface MidtransApiError {
	/** Category of the error. */
	kind: MidtransErrorKind;
	/** HTTP-style status code, normalized to the `400`–`599` range. */
	status_code: number;
	/** Original Midtrans `status_code` value, if present. */
	status_code_raw?: string;
	/** Human-readable message. */
	status_message: string;
	/** Validation messages returned by the API. */
	validation_messages?: string[];
	/** Legacy error message list returned by Snap/Invoice/Payment Link. */
	error_messages?: string[];
	/** Midtrans error identifier, when present. */
	id?: string;
	/** Original JSON response body, when it was an object. */
	details?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) {
		return undefined;
	}
	return value.map((item) => String(item));
}

function toHttpStatus(value: unknown, fallback?: number): number {
	const numeric =
		typeof value === "number"
			? value
			: typeof value === "string"
				? Number(value)
				: Number.NaN;

	if (Number.isInteger(numeric) && numeric >= 400 && numeric <= 599) {
		return numeric;
	}
	if (
		fallback !== undefined &&
		Number.isInteger(fallback) &&
		fallback >= 400 &&
		fallback <= 599
	) {
		return fallback;
	}
	return 500;
}

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
 * Normalizes any Midtrans or transport failure into a stable error object.
 *
 * Never throws: empty bodies, strings, `undefined`, and unknown JSON payloads
 * all produce a {@link MidtransApiError}.
 */
export function normalizeMidtransError(
	data: unknown,
	error?: HttpClientError
): MidtransApiError {
	const body = isRecord(data) ? data : undefined;
	const statusCodeRaw = body ? readStatusCodeRaw(body) : undefined;
	const statusCode = toHttpStatus(statusCodeRaw, error?.status);
	const statusMessage =
		body && typeof body.status_message === "string" && body.status_message
			? body.status_message
			: (error?.message ?? "Unknown Midtrans API error");

	if (body) {
		const errorMessages = asStringArray(body.error_messages);
		if (errorMessages !== undefined) {
			return {
				kind: "legacy",
				status_code: statusCode,
				status_code_raw: statusCodeRaw,
				status_message: statusMessage,
				error_messages: errorMessages,
				details: body,
			};
		}

		if (typeof body.error === "string" && body.error.length > 0) {
			return {
				kind: "unauthorized",
				status_code: statusCode,
				status_code_raw: statusCodeRaw,
				status_message: body.error,
				details: body,
			};
		}

		if (
			statusCodeRaw !== undefined ||
			typeof body.status_message === "string"
		) {
			return {
				kind: "core",
				status_code: statusCode,
				status_code_raw: statusCodeRaw,
				status_message: statusMessage,
				validation_messages: asStringArray(body.validation_messages),
				id: typeof body.id === "string" ? body.id : undefined,
				details: body,
			};
		}
	}

	return {
		kind: "transport",
		status_code: statusCode,
		status_message: statusMessage,
		details: body,
	};
}

/**
 * Type guard for normalized Midtrans errors.
 */
export function isMidtransApiError(value: unknown): value is MidtransApiError {
	return (
		isRecord(value) &&
		typeof value.kind === "string" &&
		typeof value.status_code === "number" &&
		typeof value.status_message === "string"
	);
}

/**
 * Midtrans-specific API error handler.
 *
 * Adapter used by the shared transport. Always returns a normalized error and
 * never throws, because it runs inside the transport error pipeline.
 *
 * Use {@link normalizeMidtransError} directly when normalizing a payload
 * outside the transport.
 */
export function errorHandler<TError = unknown>(
	...[response, error]: Parameters<ErrorHandler<TError>>
): TError {
	return normalizeMidtransError(response, error) as TError;
}
