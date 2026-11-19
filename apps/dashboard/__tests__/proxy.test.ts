// @vitest-environment node
import { NextRequest } from "next/server";
import { vi, type Mock } from "vitest";
import { authClient } from "../lib/auth/auth-client";
import { config, proxy } from "../proxy";

vi.mock("../lib/auth/auth-client", () => ({
	authClient: { getSession: vi.fn() },
}));
vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));

const getSession = authClient.getSession as Mock;

function requestFor(pathname: string) {
	return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

function authenticated(role: "user" | "admin" = "user") {
	return {
		data: { user: { id: "user-1", role }, session: { id: "session" } },
	};
}

beforeEach(() => {
	getSession.mockReset();
});

describe("session redirects", () => {
	it("lets an authenticated visitor render the sign-out page", async () => {
		getSession.mockResolvedValue(authenticated());

		const response = await proxy(requestFor("/sign-out"));

		expect(response.headers.get("location")).toBeNull();
		expect(response.status).toBe(200);
	});

	it("lets an authenticated visitor complete an OAuth callback", async () => {
		getSession.mockResolvedValue(authenticated());

		const response = await proxy(requestFor("/callback"));

		expect(response.headers.get("location")).toBeNull();
	});

	it("still bounces an authenticated visitor from sign-in", async () => {
		getSession.mockResolvedValue(authenticated());

		const response = await proxy(requestFor("/sign-in"));

		expect(response.headers.get("location")).toBe("http://localhost:3000/");
	});

	it("sends guests to sign-in with the original destination", async () => {
		getSession.mockResolvedValue({ data: null });

		const response = await proxy(requestFor("/account/security"));

		const location = response.headers.get("location");
		expect(location).toContain("/sign-in");
		expect(location).toContain("redirectTo=%2Faccount%2Fsecurity");
	});

	it("redirects non-admin users away from admin paths", async () => {
		getSession.mockResolvedValue(authenticated("user"));

		const response = await proxy(requestFor("/admin/usage/rates"));

		expect(response.headers.get("location")).toBe("http://localhost:3000/");
	});

	it("allows administrators through admin paths", async () => {
		getSession.mockResolvedValue(authenticated("admin"));

		const response = await proxy(requestFor("/admin/usage/rates"));

		expect(response.headers.get("location")).toBeNull();
	});
});

describe("asset library session gate", () => {
	it("sends guests from /assets to sign-in", async () => {
		getSession.mockResolvedValue({ data: null });

		const response = await proxy(requestFor("/assets"));

		const location = response.headers.get("location");
		expect(location).toContain("/sign-in");
		expect(location).toContain("redirectTo=%2Fassets");
	});

	it("keeps /assets inside the matcher", () => {
		// `assets` used to be skipped as if it were a static folder; it is a
		// dashboard route now, so the proxy must see it.
		const matcher = new RegExp(`^${config.matcher[0]}$`);

		expect(matcher.test("/assets")).toBe(true);
		expect(matcher.test("/server-components-static")).toBe(true);
	});

	it("still skips framework paths and the API", () => {
		const matcher = new RegExp(`^${config.matcher[0]}$`);

		expect(matcher.test("/_next/static/chunks/main.js")).toBe(false);
		expect(matcher.test("/api/auth/session")).toBe(false);
	});
});
