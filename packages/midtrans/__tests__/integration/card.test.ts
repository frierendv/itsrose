import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MidtransClient } from "../../src/client/client";
import { createTestCardToken } from "../../tools/card-sandbox";

const ENV_FILE = join(__dirname, "..", "..", ".env.dev");

if (existsSync(ENV_FILE)) {
	for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
		if (match?.[1] && process.env[match[1]] === undefined) {
			process.env[match[1]] = match[2];
		}
	}
}

const ENABLED =
	process.env.MIDTRANS_INTEGRATION === "1" &&
	Boolean(process.env.MIDTRANS_SERVER_KEY) &&
	Boolean(process.env.MIDTRANS_CLIENT_KEY);

const describeIntegration = ENABLED ? describe : describe.skip;

function orderId(label: string): string {
	return `SIM-INT-${label}-${Date.now()}`;
}

describeIntegration("sandbox card payments", () => {
	it("captures a tokenized card charge", async () => {
		const client = new MidtransClient();
		const tokenId = await createTestCardToken(
			"visa",
			process.env.MIDTRANS_CLIENT_KEY!
		);
		const id = orderId("CARD");

		const charge = await client.core.payment.charge({
			payment_type: "credit_card",
			transaction_details: { order_id: id, gross_amount: 15000 },
			credit_card: { token_id: tokenId },
		});

		expect(charge.error).toBeUndefined();
		const data = charge.data;
		expect(data.payment_type).toBe("credit_card");
		expect(data.transaction_status).toBe("capture");
		expect(data.fraud_status).toBe("accept");
		expect(data.masked_card).toBeTruthy();

		const status = await client.core.payment.status(id);
		expect(status.data.transaction_status).toBe("capture");
		expect(status.data.settlement_time).toBeTruthy();
	}, 60_000);

	it("reports a bank decline as a deny transaction", async () => {
		const client = new MidtransClient();
		const tokenId = await createTestCardToken(
			"visaDenied",
			process.env.MIDTRANS_CLIENT_KEY!
		);

		const charge = await client.core.payment.charge({
			payment_type: "credit_card",
			transaction_details: {
				order_id: orderId("DENY"),
				gross_amount: 15000,
			},
			credit_card: { token_id: tokenId },
		});

		// `202` is a successful API call reporting a declined transaction, so
		// the envelope stays `ok: true` while the transaction status is `deny`.
		expect(charge.ok).toBe(true);
		expect(charge.data.transaction_status).toBe("deny");
		expect(charge.data.status_code).toBe("202");
	}, 60_000);

	it("returns a 3DS redirect for a secure charge", async () => {
		const client = new MidtransClient();
		const tokenId = await createTestCardToken(
			"visa",
			process.env.MIDTRANS_CLIENT_KEY!
		);

		const charge = await client.core.payment.charge({
			payment_type: "credit_card",
			transaction_details: {
				order_id: orderId("3DS"),
				gross_amount: 15000,
			},
			credit_card: {
				token_id: tokenId,
				secure: true,
				authentication: true,
			},
		});

		expect(charge.error).toBeUndefined();
		expect(charge.data.transaction_status).toBe("pending");
		expect(charge.data.three_ds_version).toBe("2");
		expect(charge.data.redirect_url).toContain("/3ds/redirect/");
	}, 60_000);
});
