import {
	createCardToken,
	createTestCardToken,
	TEST_CARDS,
} from "../../tools/card-sandbox";

describe("card-sandbox tooling", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("throws if clientKey is missing", async () => {
		await expect(
			createCardToken({
				cardNumber: "4811111111111114",
				clientKey: "",
			})
		).rejects.toThrow("createCardToken requires a Midtrans client key");
	});

	it("tokenizes card successfully when sandbox returns token_id", async () => {
		globalThis.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				status_code: "200",
				token_id: "token-test-12345",
			}),
		} as Response);

		const token = await createCardToken({
			cardNumber: "4811111111111114",
			clientKey: "SB-Mid-client-test",
		});

		expect(token).toBe("token-test-12345");
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining("client_key=SB-Mid-client-test"),
			expect.objectContaining({
				headers: { Accept: "application/json" },
			})
		);
	});

	it("throws when token_id is missing from response", async () => {
		globalThis.fetch = jest.fn().mockResolvedValue({
			statusText: "Bad Request",
			json: async () => ({
				status_code: "400",
				status_message: "Validation Error",
			}),
		} as Response);

		await expect(
			createCardToken({
				cardNumber: "4811111111111114",
				clientKey: "SB-Mid-client-test",
			})
		).rejects.toThrow(
			"Card tokenization failed for 4811111111111114: Validation Error"
		);
	});

	it("createTestCardToken delegates with correct card number", async () => {
		globalThis.fetch = jest.fn().mockResolvedValue({
			json: async () => ({
				status_code: "200",
				token_id: "visa-token",
			}),
		} as Response);

		const token = await createTestCardToken("visa", "SB-Mid-client-test");
		expect(token).toBe("visa-token");
		expect(globalThis.fetch).toHaveBeenCalledWith(
			expect.stringContaining(`card_number=${TEST_CARDS.visa.number}`),
			expect.anything()
		);
	});
});
