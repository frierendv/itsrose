import { createHash, timingSafeEqual } from "node:crypto";
import type {
	PartialSignatureTransaction,
	SignedAmount,
	SignedNotificationFields,
} from "../typings";

/**
 * Canonicalises an amount into the form Midtrans signs.
 *
 * Midtrans hashes the raw amount string it sent (e.g. `"15000.00"`). A string
 * is therefore kept verbatim — surrounding whitespace is trimmed only — while a
 * JSON number, which carries no decimal formatting of its own, becomes the
 * 2-decimal string Midtrans would have sent.
 *
 * Keeping a string verbatim is deliberate: rewriting `"15000.00"` to `"15000"`
 * would make a tampered amount hash like the original one.
 */
export function toSignedAmount(amount: string | number): SignedAmount {
	if (typeof amount === "number") {
		return Number.isFinite(amount) ? amount.toFixed(2) : String(amount);
	}

	return amount.trim();
}

/**
 * Reads the signed fields out of an untrusted notification payload.
 *
 * Returns `null` when the payload cannot carry a signature at all.
 */
export function readSignedNotificationFields(
	payload: unknown
): SignedNotificationFields | null {
	if (
		typeof payload !== "object" ||
		payload === null ||
		Array.isArray(payload)
	) {
		return null;
	}

	const record = payload as Record<string, unknown>;
	const orderId = record.order_id;
	const statusCode = record.status_code;
	const grossAmount = record.gross_amount;
	const signatureKey = record.signature_key;

	if (typeof orderId !== "string" || orderId.length === 0) {
		return null;
	}

	if (typeof statusCode !== "string" && typeof statusCode !== "number") {
		return null;
	}

	if (typeof grossAmount !== "string" && typeof grossAmount !== "number") {
		return null;
	}

	if (typeof signatureKey !== "string" || signatureKey.length === 0) {
		return null;
	}

	return {
		order_id: orderId,
		status_code: String(statusCode),
		gross_amount: toSignedAmount(grossAmount),
		signature_key: signatureKey,
	};
}

/**
 * Builds the Midtrans notification signature.
 *
 * Formula: `SHA512(order_id + status_code + gross_amount + serverKey)`.
 */
export function createTransactionSignature(
	serverKey: string,
	transaction: Omit<PartialSignatureTransaction, "signature_key">
): string {
	// order matters
	const stringToHash = [
		transaction.order_id,
		transaction.status_code,
		transaction.gross_amount,
		serverKey,
	].join("");
	return createHash("sha512").update(stringToHash).digest("hex");
}

/**
 * Verifies a Midtrans notification signature using a constant-time compare.
 */
export function verifyTransactionSignature(
	serverKey: string,
	transaction: PartialSignatureTransaction
): boolean {
	const signatureKey = transaction.signature_key;

	if (!signatureKey) {
		return false;
	}

	const expected = createTransactionSignature(serverKey, transaction);
	const expectedBuffer = Buffer.from(expected, "utf8");
	const actualBuffer = Buffer.from(signatureKey, "utf8");

	if (expectedBuffer.length !== actualBuffer.length) {
		return false;
	}

	return timingSafeEqual(expectedBuffer, actualBuffer);
}

/**
 * Verifies the signature carried by a raw notification payload.
 *
 * The amount that is hashed is read from the payload itself, so the amount the
 * package verifies is always the amount it received.
 */
export function verifyNotificationSignature(
	serverKey: string,
	payload: unknown
): boolean {
	const fields = readSignedNotificationFields(payload);

	if (!fields) {
		return false;
	}

	return verifyTransactionSignature(serverKey, fields);
}
