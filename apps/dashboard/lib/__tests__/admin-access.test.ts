import { ADMIN_ROLE, canAccessAdmin, isAdminPath } from "../auth/admin-access";

describe("isAdminPath", () => {
	it("matches the admin root and nested paths", () => {
		expect(isAdminPath("/admin")).toBe(true);
		expect(isAdminPath("/admin/usage/rates")).toBe(true);
		expect(isAdminPath("/admin/")).toBe(true);
	});

	it("does not match lookalike or sibling paths", () => {
		expect(isAdminPath("/adminish")).toBe(false);
		expect(isAdminPath("/account")).toBe(false);
		expect(isAdminPath("")).toBe(false);
	});
});

describe("canAccessAdmin", () => {
	it("allows the admin role everywhere", () => {
		expect(canAccessAdmin("/admin", ADMIN_ROLE)).toBe(true);
		expect(canAccessAdmin("/account/billing", ADMIN_ROLE)).toBe(true);
	});

	it("leaves non-admin paths untouched", () => {
		expect(canAccessAdmin("/", undefined)).toBe(true);
		expect(canAccessAdmin("/account/billing", "user")).toBe(true);
	});

	it("blocks non-admins from admin paths", () => {
		expect(canAccessAdmin("/admin", "user")).toBe(false);
		expect(canAccessAdmin("/admin/usage/rates", undefined)).toBe(false);
		expect(canAccessAdmin("/admin", null)).toBe(false);
	});
});
