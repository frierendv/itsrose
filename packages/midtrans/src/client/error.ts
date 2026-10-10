import type { ErrorHandler } from "@itsrose/http-client";
import { ApiErrorSchema } from "../schema/error";

/**
 * Midtrans-specific API error representation containing parsed error metadata,
 * HTTP status codes, and validation error messages.
 */
export function errorHandler<TError = unknown>(
	...[response, error]: Parameters<ErrorHandler<TError>>
) {
	if ("order_id" in response) {
		return;
	}
	const parsed = ApiErrorSchema.safeParse(response);

	if (parsed.success) {
		const data = parsed.data;
		return {
			status_code:
				"status_code" in data ? data.status_code : error.status,
			status_message:
				"status_message" in data ? data.status_message : error.message,
			...data,
		} as TError;
	}

	return {
		status_code: error.status,
		status_message: error.message,
		...response,
	} satisfies TError;
}
