import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod/v4";
import { MidtransClient } from "../../src/client/client";
import { toSignedAmount } from "../../src/helper/signature";
import { InvoiceWebhookSchema, WebhookPayloadSchema } from "../../src/schema";

const SERVER_KEY = "SB-Mid-server-signature-test";

/**
 * A real sandbox notification captured from Midtrans.
 *
 * Its `gross_amount` is the raw 2-decimal string `"15000.00"` — the very
 * value the notification signature covers.
 */
const FIXTURE_BODY = (
	JSON.parse(
		readFileSync(
			join(
				__dirname,
				"..",
				"..",
				"fixtures",
				"notification",
				"transaction-card.json"
			),
			"utf8"
		)
	) as { body: Record<string, unknown> }
).body;

function sign(fields: {
	order_id: string;
	status_code: string;
	gross_amount: string;
}): string {
	return createHash("sha512")
		.update(
			`${fields.order_id}${fields.status_code}${fields.gross_amount}${SERVER_KEY}`
		)
		.digest("hex");
}

/**
 * Signs a payload the way Midtrans does: over the amount the payload
 * carries, formatted as the raw 2-decimal string.
 */
function signPayload(payload: Record<string, unknown>): string {
	const grossAmount = payload.gross_amount;

	return sign({
		order_id: String(payload.order_id),
		status_code: String(payload.status_code),
		gross_amount:
			typeof grossAmount === "number"
				? toSignedAmount(grossAmount)
				: String(grossAmount),
	});
}

/**
 * The fixture with a signature that matches the amount it carries.
 */
function signedFixture(): Record<string, unknown> {
	return {
		...FIXTURE_BODY,
		signature_key: signPayload(FIXTURE_BODY),
	};
}

function createClient(): MidtransClient {
	return new MidtransClient({ serverKey: SERVER_KEY });
}

describe("signed amount", () => {
	it("keeps the raw 2-decimal string the way Midtrans sent it", () => {
		expect(toSignedAmount("15000.00")).toBe("15000.00");
		expect(toSignedAmount(" 15000.00 ")).toBe("15000.00");
	});

	it("turns a JSON number into the 2-decimal string Midtrans signed", () => {
		expect(toSignedAmount(15000)).toBe("15000.00");
		expect(toSignedAmount(15000.5)).toBe("15000.50");
	});

	it("never rewrites a string into another string", () => {
		// "15000" and "15000.00" are two different signed values.
		expect(toSignedAmount("15000")).toBe("15000");
	});
});

describe("notification signature verification", () => {
	it("verifies a real sandbox notification", () => {
		const payload = signedFixture();

		expect(createClient().merchant.verifySignature(payload)).toBe(true);
	});

	it("rejects a tampered amount", () => {
		const payload = {
			...signedFixture(),
			gross_amount: "15000.01",
		};

		expect(createClient().merchant.verifySignature(payload)).toBe(false);
	});

	it("rejects a tampered order id", () => {
		const payload = {
			...signedFixture(),
			order_id: "ORDER-TAMPERED",
		};

		expect(createClient().merchant.verifySignature(payload)).toBe(false);
	});

	it("rejects a signature built from the parsed amount", () => {
		// The old bug: "15000.00" parsed into 15000 hashes to a different
		// digest than the one Midtrans signed.
		const payload = {
			...signedFixture(),
			signature_key: sign({
				order_id: FIXTURE_BODY.order_id as string,
				status_code: FIXTURE_BODY.status_code as string,
				gross_amount: "15000",
			}),
		};

		expect(createClient().merchant.verifySignature(payload)).toBe(false);
	});

	it("rejects a payload without a signature key", () => {
		const payload = { ...FIXTURE_BODY };
		delete payload.signature_key;

		expect(createClient().merchant.verifySignature(payload)).toBe(false);
	});

	it("verifies a payload whose amount arrived as a number", () => {
		const payload = {
			...signedFixture(),
			gross_amount: 15000,
		};

		expect(createClient().merchant.verifySignature(payload)).toBe(true);
	});
});

describe("verifyNotification", () => {
	it("returns the verified notification", () => {
		const result =
			createClient().merchant.verifyNotification(signedFixture());

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.notification.gross_amount).toBe("15000.00");
		expect(result.notification.payment_type).toBe("credit_card");
		expect(result.notification.order_id).toBe("ORDER-REDACTED");
	});

	it("fails on a tampered amount before the payload is parsed", () => {
		const result = createClient().merchant.verifyNotification({
			...signedFixture(),
			gross_amount: "1.00",
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.reason).toBe("signature_mismatch");
	});

	it("fails on a payload that carries no signed fields", () => {
		const result = createClient().merchant.verifyNotification({
			order_id: "ORDER-1",
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.reason).toBe("malformed_notification");
	});

	it("fails when the verified payload does not match the schema", () => {
		const result = createClient().merchant.verifyNotification(
			signedFixture(),
			z.object({ order_id: z.string(), nonce: z.string() })
		);

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.reason).toBe("schema_mismatch");
	});

	it("verifies and parses an invoice notification in one call", () => {
		const payload: Record<string, unknown> = {
			...signedFixture(),
			payment_type: "qris",
			metadata: { midtrans_invoice_id: "inv_123" },
		};
		const signed = { ...payload, signature_key: signPayload(payload) };

		const result = createClient().merchant.verifyNotification(
			signed,
			InvoiceWebhookSchema
		);

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.notification.gross_amount).toBe("15000.00");
		expect(result.notification.metadata.midtrans_invoice_id).toBe(
			"inv_123"
		);
	});
});

describe("webhook schemas", () => {
	it("exposes the same signed amount in both webhook schemas", () => {
		const payload: Record<string, unknown> = {
			...signedFixture(),
			payment_type: "qris",
			metadata: { midtrans_invoice_id: "inv_123" },
		};

		const notification = WebhookPayloadSchema.parse(payload);
		const invoice = InvoiceWebhookSchema.parse(payload);

		expect(notification.gross_amount).toBe("15000.00");
		expect(invoice.gross_amount).toBe("15000.00");
		expect(typeof invoice.gross_amount).toBe("string");
	});

	it("keeps the signed amount a string even when the payload carries a number", () => {
		const payload = {
			...signedFixture(),
			gross_amount: 15000,
		};

		const notification = WebhookPayloadSchema.parse(payload);

		expect(notification.gross_amount).toBe("15000.00");
	});
});
