import type { ErrorHandler, HttpClientError } from "@itsrose/http-client";
import {
	createMidtransErrorModel,
	MidtransApiErrorSchema,
	type ApiError,
} from "../schema/error";

/**
 * Normalized Midtrans API error exposed through `HttpResponse.error`.
 *
 * The type is inferred from the Zod model in `schema/error/model.ts`; it is
 * re-exported here because the client is its main consumer.
 */
export type { ApiError as MidtransApiError } from "../schema/error";

/**
 * Category of a normalized Midtrans error.
 *
 * - `core`: Midtrans Core-style error (`status_code` + `status_message`).
 * - `legacy`: `{ error_messages: string[] }` (Snap, Invoice, Payment Link).
 * - `unauthorized`: `{ error: "Unauthorized" }` (HTTP 401).
 * - `transport`: empty, plain-text, or network-level failure.
 */
export type { ApiErrorKind as MidtransErrorKind } from "../schema/error";

/**
 * Normalizes any Midtrans or transport failure into a stable error object.
 *
 * Never throws: empty bodies, strings, `undefined`, and unknown JSON payloads
 * all produce a {@link MidtransApiError}.
 *
 * The classification and the status normalization rules live in the model
 * (`schema/error/model.ts`); this function only hands the raw payload and the
 * transport outcome to it.
 */
export function normalizeMidtransError(
	data: unknown,
	error?: HttpClientError
): MidtransApiError {
	const model = createMidtransErrorModel(error?.status, error?.message);
	const parsed = model.apiError.safeParse(data);

	if (parsed.success) {
		return parsed.data;
	}

	/*
	 * The union is total: the transport member accepts every input, so this
	 * branch is only reachable if the model itself became inconsistent.
	 */
	return model.transport.parse(data);
}

/**
 * Type guard for normalized Midtrans errors.
 */
export function isMidtransApiError(value: unknown): value is MidtransApiError {
	return MidtransApiErrorSchema.safeParse(value).success;
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
