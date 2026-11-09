/**
 * Production Core and Payment Link API baseUrl
 */
export const API_BASE_URL_PRODUCTION = "https://api.midtrans.com" as const;
/**
 * Sandbox Core and Payment Link API baseUrl
 */
export const API_BASE_URL_SANDBOX = "https://api.sandbox.midtrans.com" as const;
/**
 * Production Snap API baseUrl
 */
export const SNAP_BASE_URL_PRODUCTION = "https://app.midtrans.com" as const;
/**
 * Sandbox Snap API baseUrl
 */
export const SNAP_BASE_URL_SANDBOX =
	"https://app.sandbox.midtrans.com" as const;
/**
 * Maximum allowed size of HTTP(S) request body in bytes (16KB).
 * @see https://docs.midtrans.com/reference/https-request-1
 */
export const MAX_REQUEST_SIZE = 16 * 1024;
/**
 * Default HTTP request timeout in milliseconds.
 */
export const DEFAULT_TIMEOUT = 30_000;
