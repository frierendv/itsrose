import type { z } from "zod/v4";
import { generateOrderId as buildOrderId } from "../helper/order-id";
import {
	createTransactionSignature,
	readSignedNotificationFields,
	verifyNotificationSignature,
	verifyTransactionSignature,
} from "../helper/signature";
import { WebhookPayloadSchema, type WebhookPayload } from "../schema";
import type {
	MerchantOptions,
	NotificationVerificationResult,
	PartialSignatureTransaction,
} from "../typings";

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
	 *
	 * The payload is accepted as it arrived: the signed fields — including the
	 * raw 2-decimal amount — are read by the package itself, so a caller can
	 * never hash a different amount than the one Midtrans sent.
	 */
	public verifySignature(payload: unknown): boolean {
		return verifyNotificationSignature(this.#serverKey, payload);
	}

	/**
	 * Verifies **and** parses a raw Midtrans notification in a single call.
	 *
	 * The signature is checked against the payload as it arrived, before the
	 * payload is parsed, and the notification is only handed back once both
	 * steps succeeded. Callers therefore cannot verify one payload and parse
	 * another, which is the only way a forged amount could slip through.
	 *
	 * ```ts
	 * const result = client.merchant.verifyNotification(rawPayload);
	 *
	 * if (!result.ok) {
	 *   // result.reason: "malformed_notification" | "signature_mismatch" | "schema_mismatch"
	 *   return reply.code(400).send(result.message);
	 * }
	 *
	 * result.notification.gross_amount; // "15000.00" — the signed amount
	 * ```
	 *
	 * @param payload The raw notification body, exactly as received.
	 * @param schema The notification schema to parse with. Defaults to
	 * {@link WebhookPayloadSchema}; pass {@link InvoiceWebhookSchema} for
	 * invoice notifications.
	 */
	public verifyNotification(
		payload: unknown
	): NotificationVerificationResult<WebhookPayload>;
	public verifyNotification<TNotification>(
		payload: unknown,
		schema: z.ZodType<TNotification>
	): NotificationVerificationResult<TNotification>;
	public verifyNotification(
		payload: unknown,
		schema?: z.ZodType
	): NotificationVerificationResult<unknown> {
		const fields = readSignedNotificationFields(payload);

		if (!fields) {
			return {
				ok: false,
				reason: "malformed_notification",
				message:
					"The payload does not carry the fields Midtrans signs (order_id, status_code, gross_amount, signature_key).",
			};
		}

		if (!verifyTransactionSignature(this.#serverKey, fields)) {
			return {
				ok: false,
				reason: "signature_mismatch",
				message:
					"The notification signature does not match the payload it was sent with.",
			};
		}

		const parsed = (schema ?? WebhookPayloadSchema).safeParse(payload);

		if (!parsed.success) {
			return {
				ok: false,
				reason: "schema_mismatch",
				message:
					"The verified notification does not match the expected notification schema.",
			};
		}

		return { ok: true, notification: parsed.data };
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
