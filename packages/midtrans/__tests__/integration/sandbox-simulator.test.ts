import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MidtransClient } from "../../src/client/client";
import { payCstore, payVirtualAccount } from "../../tools/sandbox-simulator";

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
	Boolean(process.env.MIDTRANS_SERVER_KEY);

const describeIntegration = ENABLED ? describe : describe.skip;

type StatusResult = Awaited<
	ReturnType<MidtransClient["core"]["payment"]["status"]>
>;

async function waitForSettlement(
	client: MidtransClient,
	orderId: string
): Promise<StatusResult> {
	let result = await client.core.payment.status(orderId);

	for (
		let attempt = 0;
		attempt < 10 && result.data.transaction_status !== "settlement";
		attempt++
	) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		result = await client.core.payment.status(orderId);
	}

	return result;
}

describeIntegration("sandbox simulator integration", () => {
	it("settles a BCA virtual account payment", async () => {
		const client = new MidtransClient();
		const orderId = `SIM-INT-BCA-${Date.now()}`;
		const charge = await client.core.payment.charge({
			payment_type: "bank_transfer",
			transaction_details: { order_id: orderId, gross_amount: 15000 },
			bank_transfer: { bank: "bca" },
		});

		expect(charge.error).toBeUndefined();
		const data = charge.data;
		expect(data.payment_type).toBe("bank_transfer");

		const vaNumber = data.va_numbers?.[0]?.va_number;
		expect(vaNumber).toBeTruthy();

		const payment = await payVirtualAccount({
			bank: "bca",
			vaNumber: vaNumber!,
			amount: 15000,
		});
		expect(payment.ok).toBe(true);

		const status = await waitForSettlement(client, orderId);
		expect(status.data.transaction_status).toBe("settlement");
	}, 60_000);

	it("settles an Alfamart payment code", async () => {
		const client = new MidtransClient();
		const orderId = `SIM-INT-ALFA-${Date.now()}`;
		const charge = await client.core.payment.charge({
			payment_type: "cstore",
			transaction_details: { order_id: orderId, gross_amount: 15000 },
			cstore: { store: "alfamart", message: "Simulator test" },
		});

		expect(charge.error).toBeUndefined();
		const data = charge.data;
		expect(data.payment_type).toBe("cstore");

		const paymentCode = data.payment_code;
		expect(paymentCode).toBeTruthy();

		const payment = await payCstore({
			store: "alfamart",
			paymentCode: paymentCode!,
		});
		expect(payment.ok).toBe(true);

		const status = await waitForSettlement(client, orderId);
		expect(status.data.transaction_status).toBe("settlement");
	}, 60_000);
});
