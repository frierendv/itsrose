import { errorHandler } from "../src/client/error";

function transportError(status: number, message: string) {
	return { status, message } as never;
}

describe("midtrans errorHandler", () => {
	it("ignores payloads that already carry an order id", () => {
		expect(
			errorHandler(
				{ order_id: "ORDER-1" } as never,
				transportError(500, "boom")
			)
		).toBeUndefined();
	});

	it("maps a parsed API error", () => {
		expect(
			errorHandler(
				{ status_code: "402", status_message: "declined" } as never,
				transportError(402, "payment failed")
			)
		).toMatchObject({ status_code: 402, status_message: "declined" });
	});

	it("falls back to the transport error for unknown payloads", () => {
		expect(
			errorHandler(
				{ unexpected: true } as never,
				transportError(503, "unavailable")
			)
		).toMatchObject({
			status_code: 503,
			status_message: "unavailable",
			unexpected: true,
		});
	});
});
