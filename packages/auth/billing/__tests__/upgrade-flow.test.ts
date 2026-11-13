import { createTransactionSignature } from "@itsrose/midtrans";
import {
	BILLING_PERIOD_MS,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
	UPGRADE_INVOICE_LIFESPAN_MS,
} from "../src/domain/constants";
import { webhookEndpoint } from "../src/plugin/routes/payment/webhook";
import { upgradeSubscriptionEndpoint } from "../src/plugin/routes/subscription/upgrade";
import type { Subscription } from "../src/types";
import {
	createMockDbAdapter,
	createMockEndpointContext,
	createMockMidtransClient,
	expectRow,
} from "./test-helpers";

describe("Mid-Cycle Upgrade Flow", () => {
	const serverKey = "test_midtrans_key";
	const client = createMockMidtransClient(serverKey);

	test("Upgrade endpoint computes prorated difference, creates 2-hour invoice, tracks proration details", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		// User is 10 days into a 30-day Hobby plan (60,000 IDR)
		const now = new Date("2026-10-11T00:00:00.000Z");
		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS); // 20 days remaining

		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				user_id: userId,
				plan_id: "hobby",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: cycleStart,
				period_end: cycleEnd,
			},
		});

		// Mock Date.now to be Day 10
		jest.useFakeTimers();
		jest.setSystemTime(now);

		const endpoint = upgradeSubscriptionEndpoint(client);
		const ctx = createMockEndpointContext({
			userId,
			adapter,
			body: { target_tier: "pro" },
		});

		const response = await endpoint(ctx);

		const { invoice, proration } = response;

		// Net difference: 160,000 - 60,000 = 100,000
		// 20 days remaining / 30 days = 66,667 IDR
		expect(invoice.gross_amount).toBe(66_667);
		expect(invoice.invoice_type).toBe(INVOICE_TYPE.UPGRADE);
		expect(invoice.target_tier).toBe("pro");
		expect(invoice.status).toBe("pending");

		// Invoice due date must be 2 hours from now
		const expectedDueDate = new Date(
			now.getTime() + UPGRADE_INVOICE_LIFESPAN_MS
		).toISOString();
		expect(invoice.due_date).toBe(expectedDueDate);

		// Proration audit values
		const prorationDetails = expectRow(proration);
		expect(prorationDetails.current_tier).toBe("hobby");
		expect(prorationDetails.target_tier).toBe("pro");
		expect(prorationDetails.payable_amount).toBe(66_667);
		expect(prorationDetails.is_cycle_reset).toBe(false);

		jest.useRealTimers();
	});

	test("Upgrade endpoint rejects target tier that is a downgrade", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				user_id: userId,
				plan_id: "business",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: new Date(),
				period_end: new Date(Date.now() + BILLING_PERIOD_MS),
			},
		});

		const endpoint = upgradeSubscriptionEndpoint(client);
		const ctx = createMockEndpointContext({
			userId,
			adapter,
			body: { target_tier: "pro" },
		});

		await expect(endpoint(ctx)).rejects.toThrow(
			/Target tier 'Pro' is a downgrade/
		);
	});

	test("Webhook settlement for prorated UPGRADE unlocks higher tier immediately and keeps cycle anchor", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);

		// Existing Hobby subscription
		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "hobby",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: cycleStart,
				period_end: cycleEnd,
			},
		});

		// Create upgrade invoice record in DB
		const orderId = "ORD-UPGRADE-123";
		const invoiceId = "INV-UPGRADE-123";
		await adapter.create({
			model: INVOICE_TABLE_NAME,
			data: {
				invoice_id: invoiceId,
				user_id: userId,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.UPGRADE,
				target_tier: "pro",
				status: "pending",
				gross_amount: 66_667,
				invoice_date: new Date(
					"2026-10-11T00:00:00.000Z"
				).toISOString(),
				due_date: new Date("2026-10-11T02:00:00.000Z").toISOString(),
				invoice_number: "INV-2026-0001",
				payment_type: "payment_link",
				proration_details: {
					is_cycle_reset: false,
					current_tier: "hobby",
					target_tier: "pro",
					payable_amount: 66_667,
				},
			},
		});

		// Store in mock Midtrans client as paid
		client.invoiceStore.set(invoiceId, {
			id: invoiceId,
			order_id: orderId,
			status: "paid",
			paid_date: new Date("2026-10-11T01:00:00.000Z").toISOString(),
		});

		// Webhook notification payload
		const webhookPayload = {
			order_id: orderId,
			status_code: "200",
			gross_amount: "66667",
			transaction_status: "settlement",
			signature_key: createTransactionSignature(serverKey, {
				order_id: orderId,
				status_code: "200",
				gross_amount: "66667",
			}),
		};

		const webhookHandler = webhookEndpoint(client);
		const ctx = createMockEndpointContext({
			adapter,
			request: {
				json: async () => webhookPayload,
			},
		});

		const result = await webhookHandler(ctx);
		expect(result.ok).toBe(true);
		expect(result.status).toBe("paid");

		// Assert subscription record in DB:
		const updatedSub = expectRow(
			await adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: userId }],
			})
		);

		expect(updatedSub).toBeDefined();
		// 1. Tier immediately upgraded to 'pro'
		expect(updatedSub.plan_id).toBe("pro");
		expect(updatedSub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
		// 2. CRITICAL DOMAIN RULE: current_period_end anchor does NOT change!
		expect(new Date(updatedSub.period_end).toISOString()).toBe(
			cycleEnd.toISOString()
		);
		expect(new Date(updatedSub.period_start).toISOString()).toBe(
			cycleStart.toISOString()
		);
	});

	test("Webhook settlement for under-24h UPGRADE resets cycle anchor (paidDate + 30 days)", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);

		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "hobby",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: cycleStart,
				period_end: cycleEnd,
			},
		});

		const orderId = "ORD-CYCLE-RESET-123";
		const invoiceId = "INV-CYCLE-RESET-123";
		const paidDate = "2026-10-30T18:00:00.000Z";

		await adapter.create({
			model: INVOICE_TABLE_NAME,
			data: {
				invoice_id: invoiceId,
				user_id: userId,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.UPGRADE,
				target_tier: "pro",
				status: "pending",
				gross_amount: 160_000,
				invoice_date: paidDate,
				due_date: paidDate,
				invoice_number: "INV-2026-0002",
				payment_type: "payment_link",
				proration_details: {
					is_cycle_reset: true,
					cycle_reset_reason: "under_24_hours",
					current_tier: "hobby",
					target_tier: "pro",
					payable_amount: 160_000,
				},
			},
		});

		client.invoiceStore.set(invoiceId, {
			id: invoiceId,
			order_id: orderId,
			status: "paid",
			paid_date: paidDate,
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

		const result = await webhookHandler(ctx);
		expect(result.ok).toBe(true);
		expect(result.status).toBe("paid");

		const updatedSub = expectRow(
			await adapter.findOne<Subscription>({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "user_id", value: userId }],
			})
		);

		// 1. Tier changed to 'pro'
		expect(updatedSub.plan_id).toBe("pro");
		// 2. Cycle anchor reset to paidDate + 30 days
		expect(new Date(updatedSub.period_start).toISOString()).toBe(
			new Date(paidDate).toISOString()
		);
		const expectedEnd = new Date(
			new Date(paidDate).getTime() + BILLING_PERIOD_MS
		);
		expect(new Date(updatedSub.period_end).toISOString()).toBe(
			expectedEnd.toISOString()
		);
	});
});
