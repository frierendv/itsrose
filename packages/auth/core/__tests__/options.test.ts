import { getAuthOptions } from "../src/server/options";

describe("getAuthOptions", () => {
	it("disables cross-subdomain and secure cookies in development without ROOT_DOMAIN", () => {
		const options = getAuthOptions({
			NODE_ENV: "development",
		} as any);

		expect(options.advanced?.useSecureCookies).toBe(false);
		expect(options.advanced?.crossSubDomainCookies?.enabled).toBe(false);
		expect(options.advanced?.crossSubDomainCookies?.domain).toBeUndefined();
		expect(options.advanced?.defaultCookieAttributes?.secure).toBe(false);
		expect(options.advanced?.defaultCookieAttributes?.sameSite).toBe("lax");
	});

	it("enables cross-subdomain and secure cookies when ROOT_DOMAIN is configured in development", () => {
		const options = getAuthOptions({
			NODE_ENV: "development",
			ROOT_DOMAIN: "itsrose.my.id",
		} as any);

		expect(options.advanced?.useSecureCookies).toBe(true);
		expect(options.advanced?.crossSubDomainCookies?.enabled).toBe(true);
		expect(options.advanced?.crossSubDomainCookies?.domain).toBe(
			"itsrose.my.id"
		);
		expect(options.advanced?.defaultCookieAttributes?.secure).toBe(true);
		expect(options.advanced?.defaultCookieAttributes?.sameSite).toBe(
			"none"
		);
	});

	it("enables cross-subdomain and secure cookies in production", () => {
		const options = getAuthOptions({
			NODE_ENV: "production",
			ROOT_DOMAIN: "itsrose.my.id",
		} as any);

		expect(options.advanced?.useSecureCookies).toBe(true);
		expect(options.advanced?.crossSubDomainCookies?.enabled).toBe(true);
		expect(options.advanced?.crossSubDomainCookies?.domain).toBe(
			"itsrose.my.id"
		);
		expect(options.advanced?.defaultCookieAttributes?.secure).toBe(true);
		expect(options.advanced?.defaultCookieAttributes?.sameSite).toBe(
			"none"
		);
	});
});
