import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	InvoiceWebhookBankTransferSchema,
	InvoiceWebhookSchema,
} from "../../src/schema";

const FIXTURES_DIR = join(__dirname, "..", "..", "fixtures");

function loadFixture(name: string): { body: Record<string, unknown> } {
	return JSON.parse(
		readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8")
	) as { body: Record<string, unknown> };
}

/**
 * A bank transfer invoice notification, with the fields the schema requires.
 */
const BANK_TRANSFER_NOTIFICATION: Record<string, unknown> = {
	status_code: "200",
	order_id: "ORDER-1",
	transaction_id: "00000000-0000-4000-8000-000000000000",
	transaction_time: "2026-11-10 21:51:59",
	transaction_status: "capture",
	fraud_status: "accept",
	payment_type: "bank_transfer",
	gross_amount: "15000.00",
	customer_details: {},
	expiry_time: "2026-11-18 21:51:59",
	metadata: { midtrans_invoice_id: "inv_123" },
	currency: "IDR",
	signature_key: "0".repeat(128),
	va_numbers: [{ bank: "bca", va_number: "1234567890" }],
	payment_amounts: [],
};

describe("invoice webhook contract", () => {
	it("parses a bank transfer notification", () => {
		const parsed = InvoiceWebhookSchema.safeParse(
			BANK_TRANSFER_NOTIFICATION
		);

		expect(parsed.success).toBe(true);
	});

	it("keeps the partial payments the notification carries", () => {
		const parsed = InvoiceWebhookBankTransferSchema.safeParse({
			payment_type: "bank_transfer",
			va_numbers: [{ bank: "bca", va_number: "1234567890" }],
			payment_amounts: [
				{ paid_at: "2026-11-10 21:51:59", amount: "5000.00" },
				{ paid_at: "2026-11-10 21:55:00", amount: "10000.00" },
			],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.payment_amounts).toHaveLength(2);
		expect(parsed.data.payment_amounts?.[0]?.amount).toBe("5000.00");
	});

	it("rejects a partial payment that is not a payment", () => {
		const parsed = InvoiceWebhookBankTransferSchema.safeParse({
			payment_type: "bank_transfer",
			va_numbers: [{ bank: "bca", va_number: "1234567890" }],
			payment_amounts: [{ amount: "5000.00" }],
		});

		expect(parsed.success).toBe(false);
	});

	it("keeps the empty payment amounts of a captured status response", () => {
		const fixture = loadFixture("core/status-pending");
		const body = fixture.body;

		expect(body.payment_amounts).toEqual([]);
		expect(
			InvoiceWebhookSchema.safeParse({
				...BANK_TRANSFER_NOTIFICATION,
				payment_amounts: body.payment_amounts,
			}).success
		).toBe(true);
	});
});
