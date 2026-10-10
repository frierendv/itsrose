export type BaseHeaders = Record<string, string | undefined>;

export interface NotificationHeaders {
	/**
	 * Append notification URLs alongside the settings configured on Midtrans dashboard.
	 */
	"X-Append-Notification"?: string;
	/**
	 * Override notification URLs disregarding the settings on Midtrans dashboard.
	 */
	"X-Override-Notification"?: string;
	/**
	 * @see {@linkcode NotificationHeaders | X-Append-Notification}
	 */
	"x-append-notification"?: string;
	/**
	 * @see {@linkcode NotificationHeaders | X-Override-Notification}
	 */
	"x-override-notification"?: string;
}

export interface IdempotencyHeaders {
	/**
	 * Unique idempotency key to prevent duplicate transaction creation on network retries.
	 */
	"X-Idempotency-Key"?: string;
	/**
	 * @see {@linkcode IdempotencyHeaders | X-Idempotency-Key}
	 */
	"x-idempotency-key"?: string;
}

export type MidtransHeaders = BaseHeaders &
	NotificationHeaders &
	IdempotencyHeaders;
