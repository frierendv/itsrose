import { describe, expect, it } from "@jest/globals";
import {
	getInvoiceStatusProps,
	getInvoiceTypeProps,
	getSubscriptionStatusProps,
} from "../status-props";

describe("getSubscriptionStatusProps", () => {
	it("maps known statuses", () => {
		expect(getSubscriptionStatusProps("active")).toEqual({
			label: "Active",
			color: "success",
		});
		expect(getSubscriptionStatusProps("pending_payment")).toEqual({
			label: "Pending Payment",
			color: "warning",
		});
		expect(getSubscriptionStatusProps("past_due")).toEqual({
			label: "Past Due",
			color: "warning",
		});
		expect(getSubscriptionStatusProps("expired")).toEqual({
			label: "Expired",
			color: "danger",
		});
	});

	it("treats canceled/cancelled as danger", () => {
		expect(getSubscriptionStatusProps("canceled")).toEqual({
			label: "Canceled",
			color: "danger",
		});
		expect(getSubscriptionStatusProps("cancelled")).toEqual({
			label: "Canceled",
			color: "danger",
		});
	});

	it("falls back for unknown and empty values", () => {
		expect(getSubscriptionStatusProps("mystery")).toEqual({
			label: "MYSTERY",
			color: "default",
		});
		expect(getSubscriptionStatusProps(null)).toEqual({
			label: "Active",
			color: "default",
		});
	});
});

describe("getInvoiceStatusProps", () => {
	it("maps paid to success", () => {
		expect(getInvoiceStatusProps("paid").color).toBe("success");
	});

	it("maps pending-like statuses to warning", () => {
		expect(getInvoiceStatusProps("pending").color).toBe("warning");
		expect(getInvoiceStatusProps("published").color).toBe("warning");
		expect(getInvoiceStatusProps("overdue").color).toBe("warning");
	});

	it("maps rejected and expired to danger", () => {
		expect(getInvoiceStatusProps("rejected").color).toBe("danger");
		expect(getInvoiceStatusProps("expired").color).toBe("danger");
	});

	it("maps void-like statuses to default", () => {
		expect(getInvoiceStatusProps("voided").color).toBe("default");
		expect(getInvoiceStatusProps("canceled").color).toBe("default");
	});

	it("falls back for unknown values", () => {
		expect(getInvoiceStatusProps("mystery")).toEqual({
			label: "MYSTERY",
			color: "default",
		});
		expect(getInvoiceStatusProps(null).label).toBe("Unknown");
	});
});

describe("getInvoiceTypeProps", () => {
	it("maps upgrade and new to accent", () => {
		expect(getInvoiceTypeProps("UPGRADE")).toEqual({
			label: "Upgrade",
			color: "accent",
		});
		expect(getInvoiceTypeProps("NEW")).toEqual({
			label: "New",
			color: "accent",
		});
	});

	it("maps renewal to default", () => {
		expect(getInvoiceTypeProps("RENEWAL")).toEqual({
			label: "Renewal",
			color: "default",
		});
	});

	it("falls back for unknown values", () => {
		expect(getInvoiceTypeProps(null)).toEqual({
			label: "Standard",
			color: "default",
		});
		expect(getInvoiceTypeProps("custom")).toEqual({
			label: "CUSTOM",
			color: "default",
		});
	});
});
