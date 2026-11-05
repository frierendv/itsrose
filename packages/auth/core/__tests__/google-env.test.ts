import {
	GOOGLE_OAUTH_ENV_KEYS,
	resolveGoogleOAuthCredentials,
} from "../src/shared/env";

describe("resolveGoogleOAuthCredentials", () => {
	it("prefers the canonical BETTER_AUTH_GOOGLE_* names", () => {
		expect(
			resolveGoogleOAuthCredentials({
				BETTER_AUTH_GOOGLE_ID: "canonical-id",
				BETTER_AUTH_GOOGLE_SECRET: "canonical-secret",
				BETTER_GOOGLE_CLIENT_ID: "legacy-id",
				BETTER_GOOGLE_CLIENT_SECRET: "legacy-secret",
			})
		).toEqual({
			clientId: "canonical-id",
			clientSecret: "canonical-secret",
		});
	});

	it("falls back to the legacy BETTER_GOOGLE_* aliases", () => {
		expect(
			resolveGoogleOAuthCredentials({
				BETTER_GOOGLE_CLIENT_ID: "legacy-id",
				BETTER_GOOGLE_CLIENT_SECRET: "legacy-secret",
			})
		).toEqual({ clientId: "legacy-id", clientSecret: "legacy-secret" });
	});

	it("returns undefined values when unconfigured or partially set", () => {
		expect(resolveGoogleOAuthCredentials({})).toEqual({
			clientId: undefined,
			clientSecret: undefined,
		});
		expect(
			resolveGoogleOAuthCredentials({ BETTER_AUTH_GOOGLE_ID: "id" })
		).toEqual({ clientId: "id", clientSecret: undefined });
	});

	it("lists both naming generations", () => {
		expect(GOOGLE_OAUTH_ENV_KEYS).toEqual([
			"BETTER_AUTH_GOOGLE_ID",
			"BETTER_AUTH_GOOGLE_SECRET",
			"BETTER_GOOGLE_CLIENT_ID",
			"BETTER_GOOGLE_CLIENT_SECRET",
		]);
	});
});
