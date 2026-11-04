import { describe, expect, it } from "@jest/globals";
import { formatDateID, formatIDR, getInvoiceStatusProps } from "../utils";

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
});
