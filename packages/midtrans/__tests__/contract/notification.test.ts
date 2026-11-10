import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WebhookPayloadSchema } from "../../src/schema";

const FIXTURES_DIR = join(__dirname, "..", "..", "fixtures");

function loadFixture(name: string): { body: unknown } {
	return JSON.parse(
		readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8")
	) as { body: unknown };
}

describe("transaction notification contract", () => {
	it("parses a status response as a notification payload", () => {
		const fixture = loadFixture("core/status-pending");
		const parsed = WebhookPayloadSchema.safeParse(fixture.body);

		expect(parsed.success).toBe(true);
	});

	it("keeps the card fields of a real sandbox notification", () => {
		const fixture = loadFixture("notification/transaction-card");
		const parsed = WebhookPayloadSchema.safeParse(fixture.body);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		const notification = parsed.data;

		expect(notification.payment_type).toBe("credit_card");
		expect(notification.transaction_status).toBe("capture");
		expect(notification.fraud_status).toBe("accept");
		// These were silently stripped before the notification schema modelled
		// the credit-card fields.
		expect(notification.masked_card).toBe("48111111-1114");
		expect(notification.bank).toBe("maybank");
		expect(notification.card_type).toBe("credit");
		expect(notification.approval_code).toBeTruthy();
		expect(notification.channel_response_code).toBe("0");
		expect(notification.channel_response_message).toBe("Approved");
		// Midtrans always sends the key, empty when there is no customer.
		expect(notification.customer_details).toEqual({});
		expect(notification.expiry_time).toBeTruthy();
	});

	it("keeps customer details when the notification carries them", () => {
		const fixture = loadFixture("notification/transaction-card");
		const body = {
			...(fixture.body as Record<string, unknown>),
			customer_details: {
				first_name: "Probe",
				email: "probe@example.org",
			},
		};

		const parsed = WebhookPayloadSchema.safeParse(body);

		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.customer_details).toEqual({
				first_name: "Probe",
				email: "probe@example.org",
			});
		}
	});

	it("requires the signature key", () => {
		const fixture = loadFixture("core/status-pending");
		const body = { ...(fixture.body as Record<string, unknown>) };
		delete body.signature_key;

		expect(WebhookPayloadSchema.safeParse(body).success).toBe(false);
	});
});
