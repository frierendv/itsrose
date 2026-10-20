import { resolveUserSubscription } from "../adapter";
import { webhookEndpoint } from "../routes/payment/webhook";
import { cancelDowngradeEndpoint } from "../routes/subscription/cancel-downgrade";
import { downgradeSubscriptionEndpoint } from "../routes/subscription/downgrade";
import {
	BILLING_PERIOD_MS,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
} from "../server/constants";
import {
	createMockDbAdapter,
	createMockEndpointContext,
	createMockMidtransClient,
} from "./test-helpers";

describe("Downgrade Scheduling and Renewal Execution", () => {
	const serverKey = "test_midtrans_key";
	const client = createMockMidtransClient(serverKey);

	test("Downgrade endpoint sets scheduled_tier, issues NO payment requests, and retains current tier access", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		const cycleStart = new Date("2026-10-01T00:00:00.000Z");
		const cycleEnd = new Date(cycleStart.getTime() + BILLING_PERIOD_MS);

		// User currently has active Business tier (400,999 IDR)
		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "business",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: cycleStart,
				period_end: cycleEnd,
				scheduled_tier: null,
			},
		});

		const endpoint = downgradeSubscriptionEndpoint();
		const ctx = createMockEndpointContext({
			userId,
			adapter,
			body: { target_tier: "hobby" },
		});

		const response: any = await endpoint(ctx as any);

		// 1. Returns confirmation of retained access
		expect(response.success).toBe(true);
		expect(response.current_tier).toBe("business");
		expect(response.scheduled_tier).toBe("hobby");
		expect(response.effective_date).toEqual(cycleEnd);

		// 2. Verified NO invoices were created in DB
		const invoices = await adapter.findMany({
			model: INVOICE_TABLE_NAME,
			where: [{ field: "user_id", value: userId }],
		});
		expect(invoices.length).toBe(0);

		// 3. User still retains full Business access
		const accessState = await resolveUserSubscription(ctx, userId);
		expect(accessState.has_access).toBe(true);
		expect(accessState.plan.plan_id).toBe("business");
		expect(accessState.scheduled_tier).toBe("hobby");
	});

	test("Cancel-downgrade endpoint reverts scheduled_tier back to null", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "business",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: new Date(),
				period_end: new Date(Date.now() + BILLING_PERIOD_MS),
				scheduled_tier: "hobby",
			},
		});

		const cancelEndpoint = cancelDowngradeEndpoint();
		const ctx = createMockEndpointContext({
			userId,
			adapter,
		});

		const response: any = await cancelEndpoint(ctx as any);

		expect(response.success).toBe(true);
		expect(response.scheduled_tier).toBeNull();

		const sub = await adapter.findOne({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "user_id", value: userId }],
		});
		expect(sub.scheduled_tier).toBeNull();
	});

	test("Renewal settlement applies scheduled_tier, advances cycle anchor by 30 days, and clears scheduled_tier", async () => {
		const adapter = createMockDbAdapter();
		const userId = "user-123";

		const previousStart = new Date("2026-10-01T00:00:00.000Z");
		const previousEnd = new Date("2026-10-31T00:00:00.000Z");

		// User currently on Pro, but with scheduled_tier = hobby
		await adapter.create({
			model: SUBSCRIPTION_TABLE_NAME,
			data: {
				id: "sub-123",
				user_id: userId,
				plan_id: "pro",
				status: SUBSCRIPTION_STATUS.ACTIVE,
				period_start: previousStart,
				period_end: previousEnd,
				scheduled_tier: "hobby",
			},
		});

		// Renewal invoice for Hobby tier (60,000 IDR)
		const orderId = "ORD-RENEWAL-123";
		const invoiceId = "INV-RENEWAL-123";
		const paidDate = "2026-10-30T10:00:00.000Z";

		await adapter.create({
			model: INVOICE_TABLE_NAME,
			data: {
				invoice_id: invoiceId,
				user_id: userId,
				order_id: orderId,
				invoice_type: INVOICE_TYPE.RENEWAL,
				target_tier: "hobby",
				status: "pending",
				gross_amount: 60_000,
				invoice_date: "2026-10-28T00:00:00.000Z",
				due_date: previousEnd.toISOString(),
				invoice_number: "INV-2026-0003",
				payment_type: "payment_link",
			},
		});

		(client as any).invoiceStore.set(invoiceId, {
			id: invoiceId,
			order_id: orderId,
			status: "paid",
			paid_date: paidDate,
		});

		const webhookPayload = {
			order_id: orderId,
			status_code: "200",
			gross_amount: "60000",
			transaction_status: "settlement",
			signature_key: (client.merchant as any).createSignature({
				order_id: orderId,
				status_code: "200",
				gross_amount: "60000",
			}),
		};

		const webhookHandler = webhookEndpoint(client);
		const ctx = createMockEndpointContext({
			adapter,
			request: {
				json: async () => webhookPayload,
			},
		});

		const result: any = await webhookHandler(ctx as any);
		expect(result.ok).toBe(true);
		expect(result.status).toBe("paid");

		const updatedSub = await adapter.findOne({
			model: SUBSCRIPTION_TABLE_NAME,
			where: [{ field: "user_id", value: userId }],
		});

		// 1. Tier successfully transitioned to scheduled 'hobby'
		expect(updatedSub.plan_id).toBe("hobby");
		// 2. scheduled_tier is cleared
		expect(updatedSub.scheduled_tier).toBeNull();
		// 3. Anchor advances smoothly by 30 days from previous period_end!
		expect(new Date(updatedSub.period_start).toISOString()).toBe(
			previousEnd.toISOString()
		);
		const expectedNewEnd = new Date(
			previousEnd.getTime() + BILLING_PERIOD_MS
		);
		expect(new Date(updatedSub.period_end).toISOString()).toBe(
			expectedNewEnd.toISOString()
		);
		expect(updatedSub.status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
	});
});
