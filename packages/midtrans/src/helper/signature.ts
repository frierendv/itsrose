import { createHash, timingSafeEqual } from "node:crypto";
import type { PartialSignatureTransaction } from "../typings";

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
