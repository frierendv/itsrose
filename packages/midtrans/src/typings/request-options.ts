import type { MidtransHeaders } from "./headers";

/**
 * Per-request execution options for Midtrans API calls.
 */
export interface RequestOptions {
	/**
	 * Custom idempotency key to prevent double charges/creation on retry.
	 */
	idempotencyKey?: string;

	/**
	 * Append notification URL to the dashboard webhook configuration.
	 */
	appendNotification?: string;

	/**
	 * Override notification URL disregarding the dashboard webhook configuration.
	 */
	overrideNotification?: string;

	/**
	 * Additional HTTP headers for this single request.
	 */
	headers?: MidtransHeaders;

	/**
	 * Timeout in milliseconds for this single request.
	 */
	timeout?: number;
}
