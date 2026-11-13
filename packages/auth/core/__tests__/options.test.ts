import { getAuthOptions } from "../src/server/options";
import type { SharedEnv } from "../src/shared";

type AuthOptionsEnv = Parameters<typeof getAuthOptions>[0];

/**
 * Baseline environment where every shared key is present but empty.
 *
 * `SharedEnv` requires all of its keys to be defined (their value may still be
 * `undefined`), so the baseline is spelled out explicitly instead of being
 * cast from a partial object.
 */
const BASE_ENV: SharedEnv = {
	DB_NAME: undefined,
	DB_USER: undefined,
	DB_PASS: undefined,
	DB_HOST: undefined,
	DB_PORT: undefined,
	DB_SSL: undefined,
	REDIS_URL: undefined,
	BETTER_AUTH_API_KEY: undefined,
	BETTER_AUTH_BASE_URL: undefined,
	BETTER_AUTH_SECRET: undefined,
	ROOT_DOMAIN: undefined,
	APP_NAME: undefined,
	APP_DOMAIN: undefined,
	APP_BASE_URL: undefined,
	BETTER_AUTH_GOOGLE_ID: undefined,
	BETTER_AUTH_GOOGLE_SECRET: undefined,
	BETTER_GOOGLE_CLIENT_ID: undefined,
	BETTER_GOOGLE_CLIENT_SECRET: undefined,
	BETTER_AUTH_GITHUB_ID: undefined,
	BETTER_AUTH_GITHUB_SECRET: undefined,
	S3_ACCOUNT_ID: undefined,
	S3_ACCESS_KEY: undefined,
	S3_SECRET_KEY: undefined,
	S3_BUCKET: undefined,
	S3_PUBLIC_DOMAIN: undefined,
};

/**
 * Builds a complete environment for `getAuthOptions()` from the given overrides.
 */
const createEnv = (
	overrides: Record<string, string | undefined> = {}
): AuthOptionsEnv => Object.assign({ ...BASE_ENV }, overrides);

describe("getAuthOptions", () => {
	it("disables cross-subdomain and secure cookies in development without ROOT_DOMAIN", () => {
		const options = getAuthOptions(
			createEnv({
				NODE_ENV: "development",
			})
		);

		expect(options.advanced?.useSecureCookies).toBe(false);
		expect(options.advanced?.crossSubDomainCookies?.enabled).toBe(false);
		expect(options.advanced?.crossSubDomainCookies?.domain).toBeUndefined();
		expect(options.advanced?.defaultCookieAttributes?.secure).toBe(false);
		expect(options.advanced?.defaultCookieAttributes?.sameSite).toBe("lax");
	});

	it("enables cross-subdomain and secure cookies when ROOT_DOMAIN is configured in development", () => {
		const options = getAuthOptions(
			createEnv({
				NODE_ENV: "development",
				ROOT_DOMAIN: "itsrose.my.id",
			})
		);

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
		const options = getAuthOptions(
			createEnv({
				NODE_ENV: "production",
				ROOT_DOMAIN: "itsrose.my.id",
			})
		);

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
