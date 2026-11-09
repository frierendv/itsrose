import type { Invoice } from "@itsrose/auth-billing";
import { describe, expect, it } from "@jest/globals";
import {
	formatDateID,
	formatIDR,
	getInvoiceStatusProps,
	isPendingInvoice,
	matchesInvoiceSearch,
	matchesInvoiceStatus,
} from "../utils";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
	return {
		invoice_id: "inv_123",
		user_id: "usr_123",
		order_id: "ORD-999",
		invoice_number: "INV/2026/001",
		target_tier: "pro",
		invoice_type: "NEW",
		status: "paid",
		gross_amount: 100000,
		currency: "IDR",
		invoice_date: new Date().toISOString(),
		...overrides,
	} as unknown as Invoice;
}

describe("billing utils", () => {
	it("formats IDR amounts through the shared formatter", () => {
		expect(formatIDR(0)).toContain("0");
		expect(formatIDR(1_500_000)).toContain("1.500.000");
	});

	it("formats valid dates and falls back with an em dash", () => {
		expect(formatDateID(null)).toBe("—");
		expect(formatDateID(undefined)).toBe("—");
		expect(formatDateID(new Date("not a date"))).toBe("—");
		expect(formatDateID("2026-11-05T00:00:00.000Z")).toContain("2026");
	});

	it("re-exports the canonical status props", () => {
		expect(getInvoiceStatusProps("paid").color).toBe("success");
		expect(getInvoiceStatusProps("void").color).toBe("default");
	});

	it("identifies pending and unpaid invoices", () => {
		expect(isPendingInvoice("pending")).toBe(true);
		expect(isPendingInvoice("PENDING")).toBe(true);
		expect(isPendingInvoice("unpaid")).toBe(true);
		expect(isPendingInvoice("paid")).toBe(false);
		expect(isPendingInvoice(null)).toBe(false);
		expect(isPendingInvoice(undefined)).toBe(false);
	});
});

describe("matchesInvoiceStatus", () => {
	it("returns true for all status filter", () => {
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "paid" }), "all")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "pending" }), "all")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "expired" }), "all")
		).toBe(true);
	});

	it("matches paid and settlement aliases", () => {
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "paid" }), "paid")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "settlement" }), "paid")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "PAID" }), "paid")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "pending" }), "paid")
		).toBe(false);
	});

	it("matches pending and unpaid aliases", () => {
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "pending" }), "pending")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "unpaid" }), "pending")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "paid" }), "pending")
		).toBe(false);
	});

	it("matches expired and expire aliases", () => {
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "expired" }), "expired")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "expire" }), "expired")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "pending" }), "expired")
		).toBe(false);
	});

	it("matches void, canceled, and cancelled aliases", () => {
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "void" }), "void")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "canceled" }), "void")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "cancelled" }), "void")
		).toBe(true);
		expect(
			matchesInvoiceStatus(makeInvoice({ status: "paid" }), "void")
		).toBe(false);
	});
});

describe("matchesInvoiceSearch", () => {
	const sample = makeInvoice({
		order_id: "ORD-ROSE-2026",
		invoice_id: "inv_rose_777",
		invoice_number: "INV/2026/NOV/04",
		target_tier: "enterprise",
		invoice_type: "RENEWAL",
	});

	it("matches empty queries", () => {
		expect(matchesInvoiceSearch(sample, "")).toBe(true);
		expect(matchesInvoiceSearch(sample, "   ")).toBe(true);
	});

	it("matches case-insensitively across order_id, invoice_id, and invoice_number", () => {
		expect(matchesInvoiceSearch(sample, "ord-rose")).toBe(true);
		expect(matchesInvoiceSearch(sample, "ROSE_777")).toBe(true);
		expect(matchesInvoiceSearch(sample, "nov/04")).toBe(true);
	});

	it("matches target_tier and invoice_type", () => {
		expect(matchesInvoiceSearch(sample, "enterprise")).toBe(true);
		expect(matchesInvoiceSearch(sample, "renewal")).toBe(true);
	});

	it("returns false when query does not match any field", () => {
		expect(matchesInvoiceSearch(sample, "unknown-query-value")).toBe(false);
	});
});
