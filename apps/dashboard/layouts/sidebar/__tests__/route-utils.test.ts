import type { SidebarItem } from "@/types/sidebar";
import { describe, expect, it } from "@jest/globals";
import {
	getAllDescendantUrls,
	hasActiveDescendant,
	isRouteActive,
} from "../route-utils";

describe("isRouteActive", () => {
	it("requires an exact match for root", () => {
		expect(isRouteActive("/", "/")).toBe(true);
		expect(isRouteActive("/account", "/")).toBe(false);
	});

	it("matches exact URLs", () => {
		expect(isRouteActive("/account/billing", "/account/billing")).toBe(
			true
		);
	});

	it("matches URLs with a trailing slash", () => {
		expect(isRouteActive("/account/billing/", "/account/billing")).toBe(
			true
		);
	});

	it("does not match unrelated paths", () => {
		expect(
			isRouteActive("/account/billing/extra", "/account/billing")
		).toBe(false);
		expect(isRouteActive("/account", "/account/billing")).toBe(false);
	});

	it("handles empty inputs", () => {
		expect(isRouteActive("", "/account")).toBe(false);
		expect(isRouteActive("/account", "")).toBe(false);
	});
});

describe("hasActiveDescendant", () => {
	const item: SidebarItem = {
		title: "Settings",
		url: "/account",
		items: [
			{ title: "Account", url: "/account" },
			{
				title: "Billing",
				url: "/account/billing",
				items: [
					{ title: "Invoices", url: "/account/billing/invoices" },
				],
			},
		],
	};

	it("detects direct and nested active children", () => {
		expect(hasActiveDescendant(item, "/account/billing")).toBe(true);
		expect(hasActiveDescendant(item, "/account/billing/invoices")).toBe(
			true
		);
	});

	it("returns false when nothing matches", () => {
		expect(hasActiveDescendant(item, "/admin")).toBe(false);
	});

	it("returns false for leaf items", () => {
		expect(hasActiveDescendant({ title: "Leaf", url: "/x" }, "/x")).toBe(
			false
		);
	});
});

describe("getAllDescendantUrls", () => {
	it("collects all descendant URLs recursively", () => {
		const item: SidebarItem = {
			title: "Admin",
			url: "/admin",
			items: [
				{ title: "Overview", url: "/admin" },
				{
					title: "Transaction",
					url: "/admin/transaction",
					items: [
						{
							title: "Events",
							url: "/admin/transaction/events",
						},
					],
				},
			],
		};

		expect(getAllDescendantUrls(item)).toEqual([
			"/admin",
			"/admin/transaction",
			"/admin/transaction/events",
		]);
	});

	it("returns an empty array for leaf items", () => {
		expect(getAllDescendantUrls({ title: "Leaf", url: "/x" })).toEqual([]);
	});
});
