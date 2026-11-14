import type { UpstreamErrorMapper } from "@itsrose/upstream-client";
import { ElevenLabsErrorResponseSchema } from "../zod-schema";

const DEFAULT_ERROR_MESSAGE = "An error occurred.";
const UNKNOWN_ERROR_MESSAGE =
	"An unknown error occurred while processing the request.";

/**
 * Extracts a human-readable message from an upstream error `detail` payload.
 *
 * The upstream payload is untrusted JSON, so every branch narrows from
 * `unknown` before reading a property.
 *
 * @param detail Raw `detail` value taken from the upstream error body.
 * @returns The extracted message, or `undefined` when none could be read.
 */
const getErrorMessage = (detail: unknown): string | undefined => {
	if (typeof detail === "string") {
		return detail;
	}

	if (Array.isArray(detail)) {
		const messages = detail
			.map((item) => {
				if (typeof item === "string") {
					return item;
				}
				let message: unknown;

				if (item && typeof item === "object") {
					if ("message" in item) {
						message = item.message;
					}
					if ("msg" in item) {
						message = item.msg;
					}
				}
				return typeof message === "string" ? message : "";
			})
			.filter(Boolean);

		return messages.length > 0 ? messages.join("; ") : undefined;
	}

	if (detail && typeof detail === "object" && "message" in detail) {
		const message = detail.message;
		return typeof message === "string" ? message : undefined;
	}

	return undefined;
};

/**
 * Reads the `detail` field out of a raw upstream error body.
 *
 * @param data Raw error payload handed over by the HTTP client.
 * @returns The `detail` value when present, otherwise `undefined`.
 */
const getErrorDetail = (data: unknown): unknown => {
	if (Buffer.isBuffer(data)) {
		try {
			const parsed: unknown = JSON.parse(data.toString());
			if (parsed && typeof parsed === "object" && "detail" in parsed) {
				return parsed.detail;
			}
		} catch {
			return undefined;
		}
		return undefined;
	}

	if (data && typeof data === "object" && "detail" in data) {
		return data.detail;
	}

	return undefined;
};

/**
 * Describes the error the ElevenLabs API answered with.
 *
 * The upstream body is untrusted: it is validated with the package schema
 * when it matches, and read defensively otherwise. The shape of the body is
 * ElevenLabs knowledge, which is why it lives here and not in the shared
 * upstream client.
 *
 * @param data Raw error payload handed over by the upstream client.
 * @param context The upstream the call was made against.
 * @returns The message and the status the caller is told about.
 */
export const mapElevenLabsError: UpstreamErrorMapper = (data, context) => {
	const statusCode = context.status ?? 500;

	// The upstream body is untrusted: validate it with the package schema when
	// it matches, and fall back to a defensive read of `detail` otherwise.
	if (Buffer.isBuffer(data)) {
		try {
			const parsed: unknown = JSON.parse(data.toString());
			const validated = ElevenLabsErrorResponseSchema.safeParse(parsed);
			const detail = validated.success
				? validated.data.detail
				: getErrorDetail(parsed);

			return {
				statusCode,
				message: getErrorMessage(detail) || UNKNOWN_ERROR_MESSAGE,
			};
		} catch {
			return {
				statusCode,
				message: UNKNOWN_ERROR_MESSAGE,
			};
		}
	}

	const validated = ElevenLabsErrorResponseSchema.safeParse(data);
	const detail = validated.success
		? validated.data.detail
		: getErrorDetail(data);

	return {
		statusCode,
		message: getErrorMessage(detail) || DEFAULT_ERROR_MESSAGE,
	};
};
