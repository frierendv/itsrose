import { generateOrderId as buildOrderId } from "../helper/order-id";
import {
	createTransactionSignature,
	verifyTransactionSignature,
} from "../helper/signature";
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
		return createTransactionSignature(this.#serverKey, transaction);
	}

	/**
	 * Validates that an incoming notification signature matches the expected SHA-512 hash
	 * using constant-time comparison to prevent timing attacks.
	 *
	 * This also can be used to verifies an {@link https://docs.midtrans.com/docs/https-notification-webhooks | incoming webhook notification}.
	 */
	public verifySignature(transaction: PartialSignatureTransaction): boolean {
		return verifyTransactionSignature(this.#serverKey, transaction);
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
		return buildOrderId(userId, prefix);
	}
}
