import {
	buildInvoiceCustomerDetails,
	buildInvoiceItemDetails,
	buildInvoiceRecord,
	buildProrationItemDescription,
	calculateInvoiceDates,
	formatInvoiceNumber,
	isVoidableStatus,
	planInvoiceChange,
	planUpgradeInvoice,
	resolveInvoiceSyncUpdate,
	sortInvoicesByDate,
	type GatewayInvoice,
} from "../src/domain/invoice.service";
import { isAdmin, isOwnerOrAdmin } from "../src/domain/permissions";
import type {
	ApiPlan,
	Subscription,
	SubscriptionStatus,
	TransactionInvoice,
} from "../src/types";

const NOW = new Date("2026-01-15T00:00:00.000Z");

function plan(
	plan_id: string,
	amount: number,
	overrides: Partial<ApiPlan> = {}
): ApiPlan {
	return {
		plan_id,
		name: plan_id,
		price: { amount, currency: "IDR", interval: "month" },
		description: null,
		features: [],
		limits: { max: 60, timeWindow: 60 },
		quota_requests: null,
		highlighted: false,
		id: `plan_${plan_id}`,
		...overrides,
	};
}

function subscription(
	plan_id: string,
	status: SubscriptionStatus,
	overrides: Partial<Subscription> = {}
): Subscription {
	return {
		id: "sub_1",
		user_id: "user_1",
		plan_id,
		interval: "month",
		status,
		period_start: "2026-01-01T00:00:00.000Z",
		period_end: "2026-02-01T00:00:00.000Z",
		...overrides,
	};
}

const FREE = plan("free", 0);
const HOBBY = plan("hobby", 160_000);
const PRO = plan("pro", 400_999);

describe("auth/billing invoice decisions", () => {
	describe("planInvoiceChange", () => {
		it("rejects the free tier", () => {
			const decision = planInvoiceChange({
				currentSubscription: null,
				currentPlan: null,
				targetPlan: FREE,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "free_tier",
				currentTier: "free",
			});
		});

		it("creates a new invoice when there is no subscription", () => {
			const decision = planInvoiceChange({
				currentSubscription: null,
				currentPlan: null,
				targetPlan: PRO,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "create",
				invoiceType: "NEW",
				payableAmount: PRO.price.amount,
				prorationDetails: null,
			});
		});

		it("rejects a second subscription to the tier already held", () => {
			const decision = planInvoiceChange({
				currentSubscription: subscription("hobby", "active"),
				currentPlan: HOBBY,
				targetPlan: HOBBY,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "already_subscribed",
				currentTier: "hobby",
			});
		});

		it("rejects a downgrade while the subscription is active", () => {
			const decision = planInvoiceChange({
				currentSubscription: subscription("pro", "active"),
				currentPlan: PRO,
				targetPlan: HOBBY,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "downgrade",
				currentTier: "pro",
			});
		});

		it("prorates an upgrade while the subscription is active", () => {
			const decision = planInvoiceChange({
				currentSubscription: subscription("hobby", "active"),
				currentPlan: HOBBY,
				targetPlan: PRO,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "create",
				invoiceType: "UPGRADE",
			});
			expect(decision.action).toBe("create");
			if (decision.action === "create") {
				expect(decision.payableAmount).toBeGreaterThan(0);
				expect(decision.payableAmount).toBeLessThanOrEqual(
					PRO.price.amount
				);
				expect(decision.prorationDetails).not.toBeNull();
			}
		});

		it("starts a fresh invoice when the subscription has expired", () => {
			const decision = planInvoiceChange({
				currentSubscription: subscription("hobby", "expired"),
				currentPlan: HOBBY,
				targetPlan: PRO,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "create",
				invoiceType: "NEW",
				payableAmount: PRO.price.amount,
			});
		});
	});

	describe("planUpgradeInvoice", () => {
		it("rejects the free tier", () => {
			const decision = planUpgradeInvoice({
				currentSubscription: null,
				currentPlan: null,
				targetPlan: FREE,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "free_tier",
			});
		});

		it("rejects a downgrade", () => {
			const decision = planUpgradeInvoice({
				currentSubscription: subscription("pro", "active"),
				currentPlan: PRO,
				targetPlan: HOBBY,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "downgrade",
			});
		});

		it("rejects an upgrade to the tier already held", () => {
			const decision = planUpgradeInvoice({
				currentSubscription: subscription("hobby", "active"),
				currentPlan: HOBBY,
				targetPlan: HOBBY,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "already_subscribed",
			});
		});

		it("always creates an UPGRADE invoice, never a NEW one", () => {
			const decision = planUpgradeInvoice({
				currentSubscription: null,
				currentPlan: null,
				targetPlan: PRO,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "create",
				invoiceType: "UPGRADE",
				payableAmount: PRO.price.amount,
			});
		});

		it("rejects an upgrade to the tier held by an expired subscription", () => {
			// The two decision tables disagree here: `planInvoiceChange` treats
			// an expired subscription as no subscription and opens a fresh
			// invoice, while `planUpgradeInvoice` compares tiers without
			// looking at the status and rejects as "already subscribed".
			// Pinned so the divergence is a deliberate change, not a surprise.
			const decision = planUpgradeInvoice({
				currentSubscription: subscription("hobby", "expired"),
				currentPlan: HOBBY,
				targetPlan: HOBBY,
				now: NOW,
			});

			expect(decision).toMatchObject({
				action: "reject",
				reason: "already_subscribed",
			});
		});
	});

	describe("invoice status and voiding", () => {
		it("does not void a settled or cancelled invoice", () => {
			expect(isVoidableStatus("paid")).toBe(false);
			expect(isVoidableStatus("void")).toBe(false);
			expect(isVoidableStatus("voided")).toBe(false);
			expect(isVoidableStatus("canceled")).toBe(false);
			expect(isVoidableStatus("rejected")).toBe(false);
		});

		it("allows voiding an invoice that was never paid", () => {
			expect(isVoidableStatus("pending")).toBe(true);
			expect(isVoidableStatus("draft")).toBe(true);
			expect(isVoidableStatus("expired")).toBe(true);
		});
	});

	describe("invoice builders", () => {
		it("numbers invoices by year and sequence", () => {
			expect(formatInvoiceNumber(2026, 42)).toBe("INV-2026-00000042");
			expect(formatInvoiceNumber(2026, 42, "BILL")).toBe(
				"BILL-2026-00000042"
			);
		});

		it("describes a prorated item against the plan it came from", () => {
			expect(
				buildProrationItemDescription(PRO, HOBBY, "hobby", false)
			).toBe("pro (Prorated Upgrade from hobby)");
			expect(
				buildProrationItemDescription(PRO, HOBBY, "hobby", true)
			).toBe("pro (Full Cycle Reset)");
		});

		it("builds one line item for the plan", () => {
			expect(
				buildInvoiceItemDetails(PRO, "pro (month)", 400_999)
			).toEqual([
				{
					item_id: "pro",
					description: "pro (month)",
					price: 400_999,
					quantity: 1,
				},
			]);
		});

		it("fills missing customer details with null", () => {
			expect(
				buildInvoiceCustomerDetails({ id: "user_1", name: null })
			).toEqual({
				id: "user_1",
				name: null,
				email: null,
				phone: null,
			});
		});

		it("maps a gateway invoice onto the stored row", () => {
			const midtrans: GatewayInvoice = {
				id: "inv_gateway",
				status: "pending",
				invoice_date: "2026-01-15T00:00:00.000Z",
				due_date: "2026-01-18T00:00:00.000Z",
				payment_type: "payment_link",
				payment_link_url: "https://pay.example/inv_gateway",
			};

			const record = buildInvoiceRecord({
				midtrans,
				userId: "user_1",
				orderId: "order_1",
				invoiceType: "NEW",
				targetTier: "pro",
				invoiceNumber: "INV-2026-00000001",
				invoiceDate: "2026-01-15T00:00:00.000Z",
				dueDate: "2026-01-18T00:00:00.000Z",
				grossAmount: 400_999,
				customerDetails: buildInvoiceCustomerDetails({ id: "user_1" }),
				itemDetails: buildInvoiceItemDetails(PRO, "pro", 400_999),
			});

			expect(record).toMatchObject({
				invoice_id: "inv_gateway",
				user_id: "user_1",
				order_id: "order_1",
				invoice_type: "NEW",
				target_tier: "pro",
				status: "pending",
				gross_amount: 400_999,
				proration_details: null,
			});
		});

		it("syncs only the fields that changed", () => {
			const existing = {
				status: "pending",
				pdf_url: "https://pdf.example/old",
				paid_pdf_url: null,
				paid_date: null,
			} as unknown as TransactionInvoice;

			expect(resolveInvoiceSyncUpdate(null, existing)).toBeNull();
			expect(
				resolveInvoiceSyncUpdate(
					{ id: "inv_1", status: "pending" },
					existing
				)
			).toBeNull();

			expect(
				resolveInvoiceSyncUpdate(
					{
						id: "inv_1",
						status: "paid",
						paid_pdf_url: "https://pdf.example/paid",
						paid_date: "2026-01-16T00:00:00.000Z",
					},
					existing
				)
			).toEqual({
				status: "paid",
				pdf_url: "https://pdf.example/old",
				paid_pdf_url: "https://pdf.example/paid",
				paid_date: "2026-01-16T00:00:00.000Z",
			});
		});

		it("sorts invoices newest first", () => {
			const invoices = [
				{ invoice_date: "2026-01-10T00:00:00.000Z" },
				{ invoice_date: "2026-01-20T00:00:00.000Z" },
				{ invoice_date: "2026-01-15T00:00:00.000Z" },
			] as unknown as TransactionInvoice[];

			expect(
				sortInvoicesByDate(invoices).map(
					(invoice) => invoice.invoice_date
				)
			).toEqual([
				"2026-01-20T00:00:00.000Z",
				"2026-01-15T00:00:00.000Z",
				"2026-01-10T00:00:00.000Z",
			]);
		});

		it("computes a due date from the invoice date", () => {
			const { invoiceDate, dueDate } = calculateInvoiceDates(3);

			expect(
				new Date(dueDate).getTime() - new Date(invoiceDate).getTime()
			).toBe(3 * 24 * 60 * 60 * 1000);
		});
	});

	describe("permissions", () => {
		it("recognises the admin role", () => {
			expect(isAdmin({ id: "u1", role: "admin" })).toBe(true);
			expect(isAdmin({ id: "u1", role: "user" })).toBe(false);
			expect(isAdmin({ id: "u1" })).toBe(false);
		});

		it("lets an owner or an admin act on a user", () => {
			expect(isOwnerOrAdmin({ id: "u1" }, "u1")).toBe(true);
			expect(isOwnerOrAdmin({ id: "u1" }, "u2")).toBe(false);
			expect(isOwnerOrAdmin({ id: "u1", role: "admin" }, "u2")).toBe(
				true
			);
		});
	});
});
