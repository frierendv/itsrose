import { formatDateID, formatDateTimeID } from "@itsrose/auth-billing/client";
import {
	extractEventIdentifiers,
	formatDate,
	formatDateTime,
	formatUnitsMicro,
	formatUsageNumber,
	getEventStatusProps,
	getSettlementStatusProps,
} from "../utils";

describe("admin number formatting", () => {
	it("formats usage counts with id-ID grouping", () => {
		expect(formatUsageNumber(1234567)).toBe("1.234.567");
		expect(formatUsageNumber(0)).toBe("0");
		expect(formatUsageNumber(-5)).toBe("0");
		expect(formatUsageNumber(1.9)).toBe("1");
	});

	it("renders a placeholder for missing or non-finite values", () => {
		expect(formatUsageNumber(null)).toBe("—");
		expect(formatUsageNumber(undefined)).toBe("—");
		expect(formatUsageNumber(Number.NaN)).toBe("—");
		expect(formatUnitsMicro(null)).toBe("—");
		expect(formatUnitsMicro(Number.POSITIVE_INFINITY)).toBe("—");
	});

	it("formats micro units with up to three decimals", () => {
		expect(formatUnitsMicro(1_500_000)).toBe("1,5");
		expect(formatUnitsMicro(1_000_000)).toBe("1");
		expect(formatUnitsMicro(0)).toBe("0");
	});
});

describe("admin date formatting", () => {
	const date = new Date("2026-11-05T12:30:00.000Z");

	it("formats dates and falls back to a dash", () => {
		expect(formatDate(date)).toBe(formatDateID(date));
		expect(formatDate("2026-11-05")).toBe(formatDateID("2026-11-05"));
		expect(formatDate(null)).toBe("-");
		expect(formatDate(undefined)).toBe("-");
	});

	it("formats date-times and falls back to a dash", () => {
		expect(formatDateTime(date)).toBe(formatDateTimeID(date));
		expect(formatDateTime(null)).toBe("-");
		expect(formatDateTime(undefined)).toBe("-");
	});
});

describe("event status props", () => {
	it("maps success events", () => {
		expect(getEventStatusProps("invoice.settlement")).toEqual({
			label: "invoice.settlement",
			color: "success",
		});
		expect(getEventStatusProps("settlement").color).toBe("success");
		expect(getEventStatusProps("invoice.success").color).toBe("success");
	});

	it("maps the domain invoice status event names", () => {
		expect(getEventStatusProps("midtrans.invoice.paid").color).toBe(
			"success"
		);
		expect(getEventStatusProps("midtrans.invoice.voided").color).toBe(
			"danger"
		);
		expect(getEventStatusProps("midtrans.invoice.rejected").color).toBe(
			"danger"
		);
		expect(getEventStatusProps("midtrans.invoice.canceled").color).toBe(
			"danger"
		);
		expect(getEventStatusProps("midtrans.invoice.pending").color).toBe(
			"warning"
		);
	});

	it("maps failure events", () => {
		expect(getEventStatusProps("invoice.failed").color).toBe("danger");
		expect(getEventStatusProps("invoice.voided").color).toBe("danger");
		expect(getEventStatusProps("payment_failed")).toEqual({
			label: "payment_failed",
			color: "danger",
		});
	});

	it("maps pending events and unknown names", () => {
		expect(getEventStatusProps("invoice.pending").color).toBe("warning");
		expect(getEventStatusProps("invoice.not_found").color).toBe("warning");
		expect(getEventStatusProps("something.else").color).toBe("default");
		expect(getEventStatusProps(null)).toEqual({
			label: "Unknown",
			color: "default",
		});
	});
});

describe("event identifiers", () => {
	it("reads identifiers from the event or its payload", () => {
		expect(extractEventIdentifiers(null)).toEqual({
			orderId: null,
			invoiceId: null,
		});
		expect(
			extractEventIdentifiers({
				order_id: "ORDER-1",
				invoice_id: "INV-1",
			})
		).toEqual({ orderId: "ORDER-1", invoiceId: "INV-1" });
		expect(
			extractEventIdentifiers({
				payload: { order_id: "ORDER-2", invoice_id: "INV-2" },
			})
		).toEqual({ orderId: "ORDER-2", invoiceId: "INV-2" });
		expect(extractEventIdentifiers({ payload: "not-an-object" })).toEqual({
			orderId: null,
			invoiceId: null,
		});
	});
});

describe("settlement status props", () => {
	it("maps settlement statuses and unknown values", () => {
		expect(getSettlementStatusProps("settled")).toEqual({
			label: "Settled",
			color: "success",
		});
		expect(getSettlementStatusProps("skipped")).toEqual({
			label: "Skipped",
			color: "warning",
		});
		expect(getSettlementStatusProps("failed")).toEqual({
			label: "Failed",
			color: "danger",
		});
		expect(getSettlementStatusProps("custom")).toEqual({
			label: "custom",
			color: "default",
		});
		expect(getSettlementStatusProps("")).toEqual({
			label: "Unknown",
			color: "default",
		});
	});
});
