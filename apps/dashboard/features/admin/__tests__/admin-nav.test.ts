import { ADMIN_SIDEBAR_ITEMS } from "@/constants/sidebar";
import type { SidebarItem } from "@/types/sidebar";
import { ADMIN_ROUTE_PATHS } from "../routes";

function flattenLeafUrls(items: SidebarItem[], acc: string[] = []): string[] {
	for (const item of items) {
		if (item.items && item.items.length > 0) {
			flattenLeafUrls(item.items, acc);
		} else {
			acc.push(item.url);
		}
	}
	return acc;
}

const navUrls = flattenLeafUrls([ADMIN_SIDEBAR_ITEMS]);

describe("admin navigation", () => {
	it("only links to real admin routes", () => {
		for (const url of navUrls) {
			expect(ADMIN_ROUTE_PATHS).toContain(url);
		}
	});

	it("lists every admin route in the navigation", () => {
		for (const path of ADMIN_ROUTE_PATHS) {
			expect(navUrls).toContain(path);
		}
	});

	it("has no duplicate destinations", () => {
		expect(new Set(navUrls).size).toBe(navUrls.length);
	});
});
