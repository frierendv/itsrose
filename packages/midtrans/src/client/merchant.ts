import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { MerchantOptions, PartialSignatureTransaction } from "../typings";

export class MidtransMerchant {
	/**
	 * Merchant id.
	 */
	public readonly merchantId?: string;
	/**
	 * Client key.
	 */
	public readonly clientKey?: string;

	public readonly baseUrl: string;
	public readonly snapBaseUrl: string;

	readonly #serverKey: string;

	constructor({
		merchantId,
		serverKey,
		clientKey,
		baseUrl,
		snapBaseUrl,
	}: MerchantOptions) {
		this.merchantId = merchantId;
		this.baseUrl = baseUrl;
		this.snapBaseUrl = snapBaseUrl;
		this.#serverKey = serverKey;

		Object.defineProperty(this, "clientKey", {
			value: clientKey,
			enumerable: false,
			writable: false,
			configurable: true,
		});
	}

	/**
	 * Create BASIC AUTH header.
	 *
	 * Utilizes Merchant Server Key as Username and blank value for Password.
	 *
	 * @template {`Basic ${string}`} BasicAuth
	 * @returns {BasicAuth}
	 */
	public createAuthKey<
		const BasicAuth extends `Basic ${string}`,
	>(): BasicAuth {
		const encodedKey = Buffer.from(this.#serverKey + ":").toString(
			"base64"
		);

		return ("Basic " + encodedKey) as BasicAuth;
	}

	/**
	 * Generates SHA-512 signature for Midtrans transaction notification verification.
	 *
	 * Formula: `SHA512(order_id + status_code + gross_amount + serverKey)`
	 */
	protected createSignature(
		transaction: Omit<PartialSignatureTransaction, "signature_key">
	): string {
		// order matter
		const stringToHash = [
			transaction.order_id,
			transaction.status_code,
			transaction.gross_amount,
			this.#serverKey,
		].join("");
		return createHash("sha512").update(stringToHash).digest("hex");
	}

	/**
	 * Validates that an incoming notification signature matches the expected SHA-512 hash
	 * using constant-time comparison to prevent timing attacks.
	 *
	 * This also can be used to verifies an {@link https://docs.midtrans.com/docs/https-notification-webhooks | incoming webhook notification}.
	 */
	public verifySignature(transaction: PartialSignatureTransaction): boolean {
		const signatureKey = transaction.signature_key;

		if (!signatureKey) {
			return false;
		}

		const expected = this.createSignature(transaction);

		const expectedBuffer = Buffer.from(expected, "utf8");
		const actualBuffer = Buffer.from(signatureKey, "utf8");

		if (expectedBuffer.length !== actualBuffer.length) {
			return false;
		}

		return timingSafeEqual(expectedBuffer, actualBuffer);
	}

	/**
	 * Generates an opaque, human-readable Order ID.
	 *
	 * ```markdown
	 * Format: ORD-YYYYMM-[4-char user hash]-[4-char random]
	 * Example: ORD-202610-8F2B-9K42
	 * ```
	 */
	public generateOrderId<const Prefix extends string = "ORD">(
		userId: string,
		prefix = "ORD" as Prefix
	): `${Prefix}-${string}-${string}-${string}` {
		const now = new Date();
		const yearMonth = now.toISOString().slice(0, 7).replace("-", ""); // "202610"

		// Derive a 4-character deterministic token from the userId
		const userSegment = createHash("sha256")
			.update(userId)
			.digest("hex")
			.slice(0, 4)
			.toUpperCase();

		// Crockford  base32-safe charset - 4 characters of unambiguous entropy
		const charset = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
		const bytes = randomBytes(4);
		let randomSegment = "";
		for (let i = 0; i < 4; i++) {
			randomSegment += charset[bytes[i]! % charset.length];
		}

		return `${prefix}-${yearMonth}-${userSegment}-${randomSegment}`;
	}
}
