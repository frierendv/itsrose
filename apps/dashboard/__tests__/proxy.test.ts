/** @jest-environment node */
import { NextRequest } from "next/server";
import { authClient } from "../lib/auth/auth-client";
import { proxy } from "../proxy";

jest.mock("../lib/auth/auth-client", () => ({
	authClient: { getSession: jest.fn() },
}));
jest.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));

const getSession = authClient.getSession as jest.Mock;

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
