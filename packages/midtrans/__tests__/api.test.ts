import { createHash } from "node:crypto";
import { Payment } from "../src/api/core-payment";
import { Subscription } from "../src/api/core-subscription";
import { Invoice } from "../src/api/invoice";
import { PaymentLink } from "../src/api/payment-link";
import { SHARED_HTTP_CLIENT } from "../src/api/shared";
import { Snap } from "../src/api/snap";
import type { MidtransClient } from "../src/client/client";
import { MidtransMerchant } from "../src/client/merchant";
import {
	isFailedStatus,
	isFraudChallenge,
	isPendingStatus,
	isRefundedStatus,
	isSuccessStatus,
} from "../src/helper/status";

function createClient() {
	const http = {
		get: jest.fn(),
		post: jest.fn(),
		patch: jest.fn(),
		put: jest.fn(),
		delete: jest.fn(),
	};
	const merchant = new MidtransMerchant({
		serverKey: "server-secret",
		clientKey: "client-key",
		merchantId: "merchant-1",
		baseUrl: "https://api.example.test",
		snapBaseUrl: "https://snap.example.test",
	});
	const client = {
		[SHARED_HTTP_CLIENT]: http,
		merchant,
	} as unknown as MidtransClient;
	return { client, http, merchant };
}

describe("Payment", () => {
	it("posts every charge-family request to its endpoint", () => {
		const { client, http } = createClient();
		const payment = new Payment(client);
		const body = { payment_type: "bank_transfer" };

		payment.charge(body as never);
		payment.capture({ transaction_id: "t" });
		payment.approve("order-1");
		payment.deny("order-1");
		payment.cancel("order-1");
		payment.expire("order-1");
		payment.directRefund("order-1", { amount: 100 } as never);

		expect(http.post.mock.calls.map((call) => call[0])).toEqual([
			"/v2/charge",
			"/v2/capture",
			"/v2/order-1/approve",
			"/v2/order-1/deny",
			"/v2/order-1/cancel",
			"/v2/order-1/expire",
			"/v2/order-1/refund/online/direct",
		]);
	});

	it("treats refund payloads and request options separately", () => {
		const { client, http } = createClient();
		const payment = new Payment(client);

		payment.refund("order-1", { amount: 500, reason: "requested" });
		payment.refund("order-2", { idempotencyKey: "refund-1" });

		expect(http.post).toHaveBeenNthCalledWith(
			1,
			"/v2/order-1/refund",
			{ amount: 500, reason: "requested" },
			undefined
		);
		expect(http.post).toHaveBeenNthCalledWith(
			2,
			"/v2/order-2/refund",
			undefined,
			{ headers: { "X-Idempotency-Key": "refund-1" }, timeout: undefined }
		);
	});

	it("queries status with optional pagination", () => {
		const { client, http } = createClient();
		const payment = new Payment(client);

		payment.status("order-1");
		payment.statusB2B("order-1", { page: 2, per_page: 5 });
		payment.statusB2B("order-1");

		expect(http.get).toHaveBeenNthCalledWith(
			1,
			"/v2/order-1/status",
			undefined
		);
		expect(http.get).toHaveBeenNthCalledWith(2, "/v2/order-1/status/b2b", {
			params: { page: "2", per_page: "5" },
		});
		expect(http.get).toHaveBeenNthCalledWith(3, "/v2/order-1/status/b2b", {
			params: { page: "0", per_page: "10" },
		});
	});

	it("maps request options into headers", () => {
		const { client, http } = createClient();
		const payment = new Payment(client);

		payment.status("order-1", {
			idempotencyKey: "key-1",
			appendNotification: "https://notify.example/append",
			overrideNotification: "https://notify.example/override",
			timeout: 1500,
			headers: { "X-Custom": "yes" },
		});

		expect(http.get).toHaveBeenCalledWith("/v2/order-1/status", {
			headers: {
				"X-Custom": "yes",
				"X-Idempotency-Key": "key-1",
				"X-Append-Notification": "https://notify.example/append",
				"X-Override-Notification": "https://notify.example/override",
			},
			timeout: 1500,
		});
	});
});

describe("Subscription", () => {
	it("calls the subscription endpoints", () => {
		const { client, http } = createClient();
		const subscription = new Subscription(client);

		subscription.create({ name: "monthly" });
		subscription.get("sub-1");
		subscription.disable("sub-1");
		subscription.cancel("sub-1");
		subscription.enable("sub-1");
		subscription.update("sub-1", { name: "yearly" });

		expect(http.post.mock.calls.map((call) => call[0])).toEqual([
			"/v1/subscriptions",
			"/v1/subscriptions/sub-1/disable",
			"/v1/subscriptions/sub-1/cancel",
			"/v1/subscriptions/sub-1/enable",
		]);
		expect(http.get).toHaveBeenCalledWith(
			"/v1/subscriptions/sub-1",
			undefined
		);
		expect(http.patch).toHaveBeenCalledWith(
			"/v1/subscriptions/sub-1",
			{
				name: "yearly",
			},
			undefined
		);
	});
});

describe("Snap", () => {
	it("calls the snap endpoints with the snap base URL", () => {
		const { client, http } = createClient();
		const snap = new Snap(client);
		const body = {
			transaction_details: { order_id: "S-1", gross_amount: 15000 },
		};

		snap.getPreferences();
		snap.create(body);

		expect(http.get).toHaveBeenCalledWith("/snap/v3/merchant-preferences", {
			baseURL: "https://snap.example.test",
		});
		expect(http.post).toHaveBeenCalledWith("/snap/v1/transactions", body, {
			baseURL: "https://snap.example.test",
		});
	});
});

describe("Invoice", () => {
	it("calls the invoice endpoints", () => {
		const { client, http } = createClient();
		const invoice = new Invoice(client);
		const body = { order_id: "INV-1" } as never;

		invoice.create(body);
		invoice.get("inv-1");
		invoice.void("inv-1");

		expect(http.post).toHaveBeenCalledWith("/v1/invoices", body, undefined);
		expect(http.get).toHaveBeenCalledWith("/v1/invoices/inv-1", undefined);
		expect(http.patch).toHaveBeenCalledWith(
			"/v1/invoices/inv-1/void",
			undefined,
			undefined
		);
	});
});

describe("PaymentLink", () => {
	it("calls the payment link endpoints", () => {
		const { client, http } = createClient();
		const paymentLink = new PaymentLink(client);
		const body = {
			transaction_details: { order_id: "PL-1", gross_amount: 15000 },
		};

		paymentLink.create(body);
		paymentLink.get("PL-1");
		paymentLink.delete("PL-1");

		expect(http.post).toHaveBeenCalledWith(
			"/v1/payment-links",
			body,
			undefined
		);
		expect(http.get).toHaveBeenCalledWith(
			"/v1/payment-links/PL-1",
			undefined
		);
		expect(http.delete).toHaveBeenCalledWith(
			"/v1/payment-links/PL-1",
			undefined
		);
	});
});

describe("MidtransMerchant", () => {
	it("builds the basic auth key", () => {
		const { merchant } = createClient();
		expect(merchant.createAuthKey()).toBe(
			`Basic ${Buffer.from("server-secret:").toString("base64")}`
		);
	});

	it("verifies notification signatures", () => {
		const { merchant } = createClient();
		const transaction = {
			order_id: "ORD-1",
			status_code: "200",
			gross_amount: "15000.00",
			signature_key: "",
		};
		const expected = createHash("sha512")
			.update(
				`${transaction.order_id}${transaction.status_code}${transaction.gross_amount}server-secret`
			)
			.digest("hex");

		expect(
			merchant.verifySignature({
				...transaction,
				signature_key: expected,
			})
		).toBe(true);
		expect(
			merchant.verifySignature({ ...transaction, signature_key: "nope" })
		).toBe(false);
		expect(merchant.verifySignature(transaction as never)).toBe(false);
	});

	it("generates formatted order ids", () => {
		const { merchant } = createClient();
		const orderId = merchant.generateOrderId("user-1");
		expect(orderId).toMatch(/^ORD-\d{6}-[0-9A-F]{4}-[0-9A-Z]{4}$/);
		expect(merchant.generateOrderId("user-1", "INV")).toMatch(
			/^INV-\d{6}-[0-9A-F]{4}-[0-9A-Z]{4}$/
		);
	});
});

describe("status helpers", () => {
	it("classifies transaction statuses", () => {
		expect(isSuccessStatus("settlement")).toBe(true);
		expect(isSuccessStatus("capture")).toBe(true);
		expect(isSuccessStatus("capture", "accept")).toBe(true);
		expect(isSuccessStatus("capture", "challenge")).toBe(false);
		expect(isSuccessStatus("pending")).toBe(false);

		expect(isPendingStatus("pending")).toBe(true);
		expect(isPendingStatus("authorize")).toBe(true);
		expect(isPendingStatus("settlement")).toBe(false);

		expect(isFailedStatus("deny")).toBe(true);
		expect(isFailedStatus("cancel")).toBe(true);
		expect(isFailedStatus("expire")).toBe(true);
		expect(isFailedStatus("pending")).toBe(false);

		expect(isRefundedStatus("refund")).toBe(true);
		expect(isRefundedStatus("partial_refund")).toBe(true);
		expect(isRefundedStatus("settlement")).toBe(false);

		expect(isFraudChallenge("challenge")).toBe(true);
		expect(isFraudChallenge("accept")).toBe(false);
	});
});
