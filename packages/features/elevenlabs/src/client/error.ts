import type { OnError } from "@itsrose/http-client";
import type { IElevenLabsErrorResponse } from "../zod-schema";

const DEFAULT_ERROR_MESSAGE = "An error occurred.";
const UNKNOWN_ERROR_MESSAGE =
	"An unknown error occurred while processing the request.";

const getErrorMessage = (detail: IElevenLabsErrorResponse["detail"]) => {
	if (typeof detail === "string") {
		return detail;
	}

	if (Array.isArray(detail)) {
		const messages = detail
			.map((item) => {
				if (typeof item === "string") {
					return item;
				}

				if (item && typeof item === "object" && "message" in item) {
					const message = (item as { message?: unknown }).message;
					return typeof message === "string" ? message : "";
				}

				return "";
			})
			.filter(Boolean);

		return messages.length > 0 ? messages.join("; ") : undefined;
	}

	return detail?.message;
};

/**
 * Parses raw error responses or buffers returned from ElevenLabs API calls.
 *
 * @param {Buffer | IElevenLabsErrorResponse} data Raw response body.
 * @param {number} [status=500] HTTP status code from response.
 * @returns {{ statusCode: number; message: string }} Standardized error object with status and descriptive message.
 */
export const parseElevenLabsError: OnError<{
	statusCode: number;
	message: string;
}> = (data: Buffer | IElevenLabsErrorResponse, status: number = 500) => {
	if (Buffer.isBuffer(data)) {
		try {
			const parsed = JSON.parse(
				data.toString()
			) as IElevenLabsErrorResponse;
			return {
				statusCode: status,
				message:
					getErrorMessage(parsed?.detail) || UNKNOWN_ERROR_MESSAGE,
			};
		} catch {
			return {
				statusCode: status,
				message: UNKNOWN_ERROR_MESSAGE,
			};
		}
	}
	return {
		statusCode: status,
		message: getErrorMessage(data?.detail) || DEFAULT_ERROR_MESSAGE,
	};
};
