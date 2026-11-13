import { createTransactionSignature } from "@itsrose/midtrans";
import {
	BILLING_PERIOD_MS,
	INVOICE_EVENT_TABLE_NAME,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
} from "../src/domain/constants";
import { webhookEndpoint } from "../src/plugin/routes/payment/webhook";
import type { Subscription } from "../src/types";
import {
	createMockDbAdapter,
	createMockEndpointContext,
	createMockMidtransClient,
	expectRow,
} from "./test-helpers";

describe("Midtrans Webhook Security & Idempotency", () => {
	const serverKey = "secret_midtrans_server_key";
	const client = createMockMidtransClient(serverKey);

	test("Rejects forged signature with 403 Forbidden error", async () => {
		const adapter = createMockDbAdapter();
		const webhookHandler = webhookEndpoint(client);

		const fakePayload = {
			order_id: "ORD-HACK-123",
			status_code: "200",
			gross_amount: "100000",
			transaction_status: "settlement",
			signature_key: "forged_invalid_signature_hash",
		};

		const ctx = createMockEndpointContext({
			adapter,
			request: {
				json: async () => fakePayload,
			},
		});

		await expect(webhookHandler(ctx)).rejects.toThrow(
			/Transaction signature verification failed/
		);
	});

	test("Duplicate webhook delivery is strictly idempotent without corrupting dates", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);

		// Subscription already active
		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "pro",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: cycleStart,
				period_end: cycleEnd,
			},
		});

		// Invoice ALREADY in 'paid' status
		const orderId = "ORD-IDEMPOTENT-123";
		const invoiceId = "INV-IDEMPOTENT-123";
		await adapter.create({
			model: INVOICE_TABLE_NAME,
			data: {
				invoice_id: invoiceId,
				user_id: userId,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.RENEWAL,
				target_tier: "pro",
				status: "paid", // Already paid!
				gross_amount: 160_000,
				invoice_date: cycleStart.toISOString(),
				due_date: cycleEnd.toISOString(),
				invoice_number: "INV-2026-9999",
				payment_type: "payment_link",
				paid_date: cycleStart.toISOString(),
			},
		});

		const webhookPayload = {
			order_id: orderId,
			status_code: "200",
			gross_amount: "160000",
			transaction_status: "settlement",
			signature_key: createTransactionSignature(serverKey, {
				order_id: orderId,
				status_code: "200",
				gross_amount: "160000",
			}),
		};

		const webhookHandler = webhookEndpoint(client);
		const ctx = createMockEndpointContext({
			adapter,
			request: {
				json: async () => webhookPayload,
			},
		});

		// First duplicate delivery
		const response = await webhookHandler(ctx);

		// Must return idempotent_skip
		expect(response.ok).toBe(true);
		expect(response.status).toBe("idempotent_skip");

		// Subscription dates MUST remain unchanged!
		const sub = expectRow(
			await adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: userId }],
			})
		);

		expect(new Date(sub.period_end).toISOString()).toBe(
			cycleEnd.toISOString()
		);
		expect(new Date(sub.period_start).toISOString()).toBe(
			cycleStart.toISOString()
		);

		// Verify duplicate event was recorded in audit logs
		const events = await adapter.findMany({
			model: INVOICE_EVENT_TABLE_NAME,
			where: [
				{
					field: "event_name",
					value: "midtrans.webhook.duplicate_ignored",
				},
			],
		});
		expect(events.length).toBe(1);
	});
});
