import { payCstore, payVirtualAccount } from "../../tools/sandbox-simulator";

describe("sandbox-simulator tooling", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("throws for unsupported virtual account bank", async () => {
		await expect(
			payVirtualAccount({
				bank: "unknown_bank" as any,
				vaNumber: "12345",
				amount: 10000,
			})
		).rejects.toThrow("unsupported virtual-account bank");
	});

	it("throws when indomaret productCode is missing", async () => {
		await expect(
			payCstore({
				store: "indomaret",
				paymentCode: "12345",
			})
		).rejects.toThrow("Indomaret requires the merchant product code");
	});

	it("simulates BCA payment via inquiry form", async () => {
		const formHtml = `
			<form action="/bca/va/payment" method="POST">
				<input type="hidden" name="transaction_id" value="tx-123" />
				<input type="hidden" name="company_code" value="12345" />
			</form>
		`;
		const successHtml = `
			<div class="alert alert-success">Payment successful</div>
		`;

		let step = 0;
		globalThis.fetch = jest.fn().mockImplementation(async () => {
			step++;
			if (step === 1) {
				return {
					status: 200,
					text: async () => formHtml,
				} as Response;
			}
			return {
				status: 200,
				text: async () => successHtml,
			} as Response;
		});

		const result = await payVirtualAccount({
			bank: "bca",
			vaNumber: "1234512345",
			amount: 15000,
		});

		expect(result.status).toBe(200);
		expect(result.ok).toBe(true);
		expect(result.body).toContain("Payment successful");
	});

	it("simulates Alfamart payment via inquiry form", async () => {
		const formHtml = `
			<form action="/alfamart/payment" method="POST">
				<input type="hidden" name="payment_code" value="ALFA123" />
			</form>
		`;
		const successHtml = `
			<div class="alert alert-success">Transaction successful</div>
		`;

		let step = 0;
		globalThis.fetch = jest.fn().mockImplementation(async () => {
			step++;
			if (step === 1) {
				return {
					status: 200,
					text: async () => formHtml,
				} as Response;
			}
			return {
				status: 200,
				text: async () => successHtml,
			} as Response;
		});

		const result = await payCstore({
			store: "alfamart",
			paymentCode: "ALFA123",
		});

		expect(result.status).toBe(200);
		expect(result.ok).toBe(true);
	});
});
