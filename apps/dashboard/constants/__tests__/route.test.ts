import {
	AUTH_GUEST_ONLY_ROUTES,
	AUTH_ROUTES,
	matchesRoute,
	shouldLeaveAuthRoute,
} from "../route";

describe("auth route classification", () => {
	it("lists every auth view", () => {
		expect(AUTH_ROUTES).toEqual(
			expect.arrayContaining([
				"/sign-in",
				"/sign-up",
				"/sign-out",
				"/callback",
				"/error",
				"/redirect",
				"/verify-email",
				"/forgot-password",
				"/reset-password",
				"/reset-link-sent",
			])
		);
	});

	it("treats only entry views as guest-only", () => {
		expect(AUTH_GUEST_ONLY_ROUTES).toEqual(
			expect.arrayContaining([
				"/sign-in",
				"/sign-up",
				"/forgot-password",
				"/reset-password",
				"/reset-link-sent",
			])
		);
		for (const route of [
			"/sign-out",
			"/callback",
			"/error",
			"/redirect",
			"/verify-email",
		]) {
			expect(AUTH_GUEST_ONLY_ROUTES).not.toContain(route);
		}
	});

	it("matches nested segments", () => {
		expect(matchesRoute("/sign-in", AUTH_ROUTES)).toBe(true);
		expect(matchesRoute("/sign-out", AUTH_ROUTES)).toBe(true);
		expect(matchesRoute("/sign-in/step", AUTH_ROUTES)).toBe(true);
		expect(matchesRoute("/status", AUTH_ROUTES)).toBe(false);
	});
});

describe("shouldLeaveAuthRoute", () => {
	it("keeps sign-out and callbacks reachable while signed in", () => {
		expect(shouldLeaveAuthRoute("/sign-out", true)).toBe(false);
		expect(shouldLeaveAuthRoute("/verify-email", true)).toBe(false);
		expect(shouldLeaveAuthRoute("/callback", true)).toBe(false);
		expect(shouldLeaveAuthRoute("/error", true)).toBe(false);
		expect(shouldLeaveAuthRoute("/redirect", true)).toBe(false);
	});

	it("bounces signed-in visitors away from entry views", () => {
		expect(shouldLeaveAuthRoute("/sign-in", true)).toBe(true);
		expect(shouldLeaveAuthRoute("/sign-up", true)).toBe(true);
		expect(shouldLeaveAuthRoute("/forgot-password", true)).toBe(true);
		expect(shouldLeaveAuthRoute("/reset-password", true)).toBe(true);
		expect(shouldLeaveAuthRoute("/reset-link-sent", true)).toBe(true);
	});

	it("never redirects guests", () => {
		expect(shouldLeaveAuthRoute("/sign-in", false)).toBe(false);
		expect(shouldLeaveAuthRoute("/sign-out", false)).toBe(false);
	});
});
