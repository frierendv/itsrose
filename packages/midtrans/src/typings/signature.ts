/**
 * The gross amount exactly as Midtrans signs it.
 *
 * Midtrans hashes the raw 2-decimal amount string it sent (e.g. `"15000.00"`).
 * A number carries no decimal formatting, so the signed amount is always a
 * string: `"15000"` and `"15000.00"` are two different digests.
 */
export type SignedAmount = string;

/**
 * Bare transaction object for signature generation.
 */
export interface PartialSignatureTransaction {
	order_id: string;
	status_code: string | number;
	/**
	 * The signed amount, always the raw 2-decimal string Midtrans sent.
	 */
	gross_amount: SignedAmount;
	signature_key?: string;
}

/**
 * The fields Midtrans signs, read out of an untrusted notification payload.
 *
 * They are extracted by the package itself so no caller has to know which
 * fields are signed, nor how the amount is formatted.
 */
export interface SignedNotificationFields {
	order_id: string;
	status_code: string;
	gross_amount: SignedAmount;
	signature_key: string;
}

/**
 * Why a notification could not be verified and parsed.
 *
 * - `malformed_notification`: the payload does not carry the signed fields.
 * - `signature_mismatch`: the signature does not match the payload.
 * - `schema_mismatch`: the verified payload is not a valid notification.
 */
export type NotificationVerificationReason =
	"malformed_notification" | "signature_mismatch" | "schema_mismatch";

/**
 * A notification that was verified and parsed successfully.
 */
export interface NotificationVerificationSuccess<TNotification> {
	readonly ok: true;
	readonly notification: TNotification;
}

/**
 * A notification that could not be verified and parsed.
 */
export interface NotificationVerificationFailure {
	readonly ok: false;
	readonly reason: NotificationVerificationReason;
	readonly message: string;
}

/**
 * Outcome of verifying and parsing a raw Midtrans notification.
 *
 * The `ok` discriminant makes the failure path impossible to ignore: a
 * notification is only handed to the caller once its signature matched.
 */
export type NotificationVerificationResult<TNotification> =
	| NotificationVerificationSuccess<TNotification>
	| NotificationVerificationFailure;
