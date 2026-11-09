/**
 * Business `status_code` values that Midtrans treats as successful.
 *
 * Core API answers **HTTP 200 even for failures**, so the body `status_code`
 * is the authoritative signal. `407` is a success (`Success, transaction is
 * expired`) and must not be classified as an HTTP error.
 */
export const BUSINESS_SUCCESS_CODES: ReadonlySet<string> = new Set([
	"200",
	"201",
	"202",
	"407",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalizes a business status code value into its string form.
 */
export function normalizeStatusCodeValue(value: unknown): string | undefined {
	if (typeof value === "number" && Number.isInteger(value)) {
		return String(value);
	}
	if (typeof value === "string" && value.trim().length > 0) {
		return value.trim();
	}
	return undefined;
}

/**
 * Reads the Midtrans business status code from a response body or headers.
 *
 * The body wins over the `status-code` header, which is only present on some
 * Core API responses.
 */
export function readBusinessStatusCode(
	data: unknown,
	headers: unknown
): string | undefined {
	if (isRecord(data)) {
		const fromBody = normalizeStatusCodeValue(data.status_code);
		if (fromBody !== undefined) {
			return fromBody;
		}
	}
	if (isRecord(headers)) {
		const fromHeader = normalizeStatusCodeValue(headers["status-code"]);
		if (fromHeader !== undefined) {
			return fromHeader;
		}
	}
	return undefined;
}

/**
 * Decides whether a response is successful.
 *
 * When a business status code is present it is authoritative; otherwise the
 * response falls back to the HTTP status (Snap, Invoice and Payment Link
 * responses do not expose a body `status_code`).
 */
export function isSuccessfulResponse(
	businessStatusCode: string | undefined,
	httpStatus: number
): boolean {
	if (businessStatusCode !== undefined) {
		return BUSINESS_SUCCESS_CODES.has(businessStatusCode);
	}
	return httpStatus >= 200 && httpStatus < 300;
}
