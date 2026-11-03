import {
	dispatchRenewalInvoices,
	runAllBillingCronTasks,
	sweepPastDueAndExpired,
	trackGracePeriods,
} from "../src/adapter/cron";
import {
	GRACE_PERIOD_MS,
	INVOICE_TABLE_NAME,
	INVOICE_TYPE,
	SUBSCRIPTION_STATUS,
	SUBSCRIPTION_TABLE_NAME,
} from "../src/domain/constants";
import {
	createMockDbAdapter,
	createMockEndpointContext,
	createMockMidtransClient,
} from "./test-helpers";

describe("Recurring Billing Cron Engine", () => {
	const serverKey = "test_midtrans_key";
	const client = createMockMidtransClient(serverKey);

	describe("dispatchRenewalInvoices", () => {
		test("Dispatches scheduled renewal invoice at D-3 and honors scheduled_tier", async () => {
			const adapter = createMockDbAdapter();
			const now = new Date("2026-10-28T00:00:00.000Z"); // D-3 before Oct 31
			const periodEnd = new Date("2026-10-31T00:00:00.000Z");

			// User on Pro (160k) with scheduled downgrade to Hobby (60k)
			await adapter.create({
				model: SUBSCRIPTION_TABLE_NAME,
				data: {
					id: "sub-1",
					user_id: "user-123",
					plan_id: "pro",
					status: SUBSCRIPTION_STATUS.ACTIVE,
					period_start: new Date("2026-10-01T00:00:00.000Z"),
					period_end: periodEnd,
					scheduled_tier: "hobby",
					cancel_at_period_end: false,
				},
			});

			const ctx = createMockEndpointContext({ adapter });
			const result = await dispatchRenewalInvoices(ctx, client, { now });

			expect(result.dispatched).toBe(1);
			expect(result.errors.length).toBe(0);

			// Verify created invoice in DB:
			const invoices = await adapter.findMany({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "user_id", value: "user-123" }],
			});

			expect(invoices.length).toBe(1);
			const invoice = invoices[0];
			expect(invoice.invoice_type).toBe(INVOICE_TYPE.RENEWAL);
			// Must bill for scheduled_tier ('hobby' = 60,000 IDR)
			expect(invoice.target_tier).toBe("hobby");
			expect(invoice.gross_amount).toBe(60_000);
			expect(invoice.status).toBe("pending");
		});

		test("Does not dispatch renewal invoice if cancel_at_period_end is true", async () => {
			const adapter = createMockDbAdapter();
			const now = new Date("2026-10-28T00:00:00.000Z");
			const periodEnd = new Date("2026-10-31T00:00:00.000Z");

			await adapter.create({
				model: SUBSCRIPTION_TABLE_NAME,
				data: {
					id: "sub-canceled",
					user_id: "user-canceled",
					plan_id: "pro",
					status: SUBSCRIPTION_STATUS.ACTIVE,
					period_start: new Date("2026-10-01T00:00:00.000Z"),
					period_end: periodEnd,
					cancel_at_period_end: true, // User chose to cancel
				},
			});

			const ctx = createMockEndpointContext({ adapter });
			const result = await dispatchRenewalInvoices(ctx, client, { now });

			expect(result.dispatched).toBe(0);
		});

		test("Idempotent: Does not create duplicate renewal invoices if one is already pending", async () => {
			const adapter = createMockDbAdapter();
			const now = new Date("2026-10-28T00:00:00.000Z");
			const periodEnd = new Date("2026-10-31T00:00:00.000Z");

			await adapter.create({
				model: SUBSCRIPTION_TABLE_NAME,
				data: {
					id: "sub-1",
					user_id: "user-123",
					plan_id: "pro",
					status: SUBSCRIPTION_STATUS.ACTIVE,
					period_start: new Date("2026-10-01T00:00:00.000Z"),
					period_end: periodEnd,
					cancel_at_period_end: false,
				},
			});

			const ctx = createMockEndpointContext({ adapter });

			// Run 1: dispatches 1
			const firstRun = await dispatchRenewalInvoices(ctx, client, {
				now,
			});
			expect(firstRun.dispatched).toBe(1);

			// Run 2: skips duplicate
			const secondRun = await dispatchRenewalInvoices(ctx, client, {
				now,
			});
			expect(secondRun.dispatched).toBe(0);

			const invoices = await adapter.findMany({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "user_id", value: "user-123" }],
			});
			expect(invoices.length).toBe(1);
		});
	});

	describe("trackGracePeriods", () => {
		test("Transitions active subscriptions to PAST_DUE and sets grace_period_end when period has expired", async () => {
			const adapter = createMockDbAdapter();
			const periodEnd = new Date("2026-10-31T00:00:00.000Z");
			const now = new Date("2026-10-31T12:00:00.000Z"); // 12 hours past period_end

			await adapter.create({
				model: SUBSCRIPTION_TABLE_NAME,
				data: {
					id: "sub-grace",
					user_id: "user-grace",
					plan_id: "pro",
					status: SUBSCRIPTION_STATUS.ACTIVE,
					period_start: new Date("2026-10-01T00:00:00.000Z"),
					period_end: periodEnd,
				},
			});

			const ctx = createMockEndpointContext({ adapter });
			const result = await trackGracePeriods(ctx, { now });

			expect(result.tracked).toBe(1);

			const sub = await adapter.findOne({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: "sub-grace" }],
			});

			expect(sub.status).toBe(SUBSCRIPTION_STATUS.PAST_DUE);
			const expectedGraceEnd = new Date(
				periodEnd.getTime() + GRACE_PERIOD_MS
			);
			expect(new Date(sub.grace_period_end).toISOString()).toBe(
				expectedGraceEnd.toISOString()
			);
		});
	});

	describe("sweepPastDueAndExpired", () => {
		test("Sweeps subscriptions past grace period to EXPIRED and resets plan to free", async () => {
			const adapter = createMockDbAdapter();
			const periodEnd = new Date("2026-10-31T00:00:00.000Z");
			// 4 days after period_end (past 3-day grace period)
			const now = new Date("2026-11-04T00:00:00.000Z");

			await adapter.create({
				model: SUBSCRIPTION_TABLE_NAME,
				data: {
					id: "sub-expired",
					user_id: "user-expired",
					plan_id: "pro",
					status: SUBSCRIPTION_STATUS.PAST_DUE,
					period_start: new Date("2026-10-01T00:00:00.000Z"),
					period_end: periodEnd,
					grace_period_end: new Date(
						periodEnd.getTime() + GRACE_PERIOD_MS
					),
				},
			});

			// Also has open pending invoice that should be voided
			await adapter.create({
				model: INVOICE_TABLE_NAME,
				data: {
					invoice_id: "inv-to-void",
					user_id: "user-expired",
					order_id: "ord-to-void",
					status: "pending",
					gross_amount: 160_000,
					invoice_type: INVOICE_TYPE.RENEWAL,
					target_tier: "pro",
					invoice_date: periodEnd.toISOString(),
					due_date: periodEnd.toISOString(),
					invoice_number: "INV-2026-VOID",
					payment_type: "payment_link",
				},
			});

			const ctx = createMockEndpointContext({ adapter });
			const result = await sweepPastDueAndExpired(ctx, client, { now });

			expect(result.swept).toBe(1);

			const sub = await adapter.findOne({
				model: SUBSCRIPTION_TABLE_NAME,
				where: [{ field: "id", value: "sub-expired" }],
			});

			expect(sub.status).toBe(SUBSCRIPTION_STATUS.EXPIRED);
			expect(sub.plan_id).toBe("free");

			// Check invoice was voided
			const inv = await adapter.findOne({
				model: INVOICE_TABLE_NAME,
				where: [{ field: "invoice_id", value: "inv-to-void" }],
			});
			expect(inv.status).toBe("void");
		});
	});

	describe("runAllBillingCronTasks", () => {
		test("Executes all recurring billing jobs in one call", async () => {
			const adapter = createMockDbAdapter();
			const now = new Date("2026-10-28T00:00:00.000Z");

			const ctx = createMockEndpointContext({ adapter });
			const result = await runAllBillingCronTasks(ctx, client, { now });

			expect(result).toHaveProperty("dispatched_renewals");
			expect(result).toHaveProperty("tracked_grace_periods");
			expect(result).toHaveProperty("swept_expired");
			expect(result.errors).toEqual([]);
		});
	});
});
