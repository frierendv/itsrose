import type { HttpClientError } from "@itsrose/http-client";
import {
	errorHandler,
	isMidtransApiError,
	normalizeMidtransError,
} from "../src/client/error";

function transportError(status: number, message: string): HttpClientError {
	return { status, message } as HttpClientError;
}

describe("midtrans error normalization", () => {
	it("normalizes Core API errors", () => {
		const result = errorHandler(
			{
				status_code: "402",
				status_message: "declined",
				id: "err-1",
				validation_messages: ["amount is invalid"],
			},
			transportError(402, "payment failed")
		);

		expect(result).toMatchObject({
			kind: "core",
			status_code: 402,
			status_code_raw: "402",
			status_message: "declined",
			id: "err-1",
			validation_messages: ["amount is invalid"],
		});
	});

	it("normalizes numeric Core status codes", () => {
		const result = normalizeMidtransError(
			{ status_code: 412, status_message: "cannot update" },
			transportError(412, "cannot update")
		);

		expect(result).toMatchObject({
			kind: "core",
			status_code: 412,
			status_code_raw: "412",
		});
	});

	it("normalizes legacy error_messages envelopes", () => {
		const result = normalizeMidtransError(
			{ error_messages: ["Not Found"] },
			transportError(404, "Request failed with status code 404")
		);

		expect(result).toMatchObject({
			kind: "legacy",
			status_code: 404,
			error_messages: ["Not Found"],
			status_message: "Request failed with status code 404",
		});
	});

	it("normalizes 401 unauthorized errors", () => {
		const result = normalizeMidtransError(
			{ error: "Unauthorized" },
			transportError(401, "Request failed with status code 401")
		);

		expect(result).toMatchObject({
			kind: "unauthorized",
			status_code: 401,
			status_message: "Unauthorized",
		});
	});

	it("normalizes subscription-shaped errors", () => {
		const result = normalizeMidtransError(
			{
				status_message: "Invalid parameter.",
				validation_messages: ["subscription.token is required"],
			},
			transportError(400, "Request failed with status code 400")
		);

		expect(result).toMatchObject({
			kind: "core",
			status_code: 400,
			status_message: "Invalid parameter.",
			validation_messages: ["subscription.token is required"],
		});
	});

	it("normalizes empty response bodies without throwing", () => {
		const result = normalizeMidtransError(
			"",
			transportError(404, "Request failed with status code 404")
		);

		expect(result).toMatchObject({
			kind: "transport",
			status_code: 404,
			status_message: "Request failed with status code 404",
		});
	});

	it("normalizes undefined response bodies without throwing", () => {
		const result = normalizeMidtransError(undefined);

		expect(result).toMatchObject({
			kind: "transport",
			status_code: 500,
			status_message: "Unknown Midtrans API error",
		});
	});

	it("keeps unknown payloads as details instead of dropping the error", () => {
		const result = normalizeMidtransError(
			{ unexpected: true },
			transportError(503, "unavailable")
		);

		expect(result).toMatchObject({
			kind: "transport",
			status_code: 503,
			status_message: "unavailable",
			details: { unexpected: true },
		});
	});

	it("treats a payload with order_id as a normal error", () => {
		const result = normalizeMidtransError(
			{ order_id: "ORDER-1", status_message: "failed" },
			transportError(500, "boom")
		);

		expect(result).toMatchObject({
			kind: "core",
			status_code: 500,
			status_message: "failed",
		});
	});

	it("never throws for hostile inputs", () => {
		expect(() => normalizeMidtransError(Symbol("hostile"))).not.toThrow();
		expect(() => normalizeMidtransError(null)).not.toThrow();
		expect(() => normalizeMidtransError([1, 2, 3])).not.toThrow();
	});

	it("exposes a type guard", () => {
		const normalized = normalizeMidtransError({ error: "Unauthorized" });

		expect(isMidtransApiError(normalized)).toBe(true);
		expect(isMidtransApiError({})).toBe(false);
		expect(isMidtransApiError(null)).toBe(false);
	});
});
