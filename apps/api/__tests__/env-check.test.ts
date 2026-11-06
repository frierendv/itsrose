import { ENVS, PACKAGE_ENV_KEYS } from "@/lib/env";
import {
	assertApiEnv,
	BOOT_REQUIRED_KEYS,
	formatEnvProblems,
	validateApiEnv,
} from "@/lib/env-check";

const VALID_ENV: Record<string, string> = {
	DB_NAME: "itsrose",
	DB_USER: "itsrose",
	DB_PASS: "secret",
	DB_HOST: "127.0.0.1",
	DB_PORT: "5432",
	REDIS_URL: "redis://127.0.0.1:6379",
	BETTER_AUTH_SECRET: "a".repeat(32),
	MIDTRANS_SERVER_KEY: "server-key",
	S3_ACCOUNT_ID: "account",
	S3_ACCESS_KEY: "access",
	S3_SECRET_KEY: "secret",
	S3_BUCKET: "bucket",
	ELEVENLABS_API_KEY: "eleven",
	TIKTOK_TIKWM_BASE_URL: "https://tikwm.example.com",
	TIKTOK_TIKWM_APIKEY: "tikwm-key",
	MTXX_SDK_BASE_URL: "https://mtxx.example.com",
	MTXX_OPENAPI_BASE_URL: "https://mtxx.example.com",
	MTXX_KEY: "mtxx-key",
	MTXX_SECRET: "mtxx-secret",
	CAI_USER_TOKEN: "cai-token",
	CAI_NEO_BASE_URL: "https://cai.example.com",
	BILLING_CRON_SECRET: "cron-secret",
	REMINI_API_BASE_URL: "https://remini.example.com",
	REMINI_WSS_BASE_URL: "wss://remini.example.com",
	EUSEND_API_KEY: "mail-key",
	EUSEND_FROM: "auth@example.com",
};

describe("validateApiEnv", () => {
	it("accepts a complete configuration without warnings", () => {
		const result = validateApiEnv(VALID_ENV);
		expect(result.missing).toEqual([]);
		expect(result.invalid).toEqual([]);
		expect(result.warnings).toEqual([]);
	});

	it("reports every missing boot variable at once", () => {
		const result = validateApiEnv({});
		expect(result.missing.length).toBe(BOOT_REQUIRED_KEYS.length);
		expect(result.missing).toEqual(
			expect.arrayContaining([
				"DB_NAME",
				"REDIS_URL",
				"BETTER_AUTH_SECRET",
				"MIDTRANS_SERVER_KEY",
				"ELEVENLABS_API_KEY",
				"MTXX_KEY",
				"CAI_USER_TOKEN",
				"S3_BUCKET",
			])
		);
		expect(result.warnings.length).toBeGreaterThan(0);
	});

	it("flags malformed values", () => {
		const result = validateApiEnv({
			...VALID_ENV,
			DB_PORT: "not-a-port",
			REDIS_URL: "http://localhost:6379",
			USAGE_QUOTA_ENFORCEMENT: "loud",
			USAGE_FLUSH_INTERVAL_SECONDS: "-5",
			APP_BASE_URL: "not a url",
		});
		const keys = result.invalid.map((problem) => problem.key);
		expect(keys).toEqual(
			expect.arrayContaining([
				"DB_PORT",
				"REDIS_URL",
				"USAGE_QUOTA_ENFORCEMENT",
				"USAGE_FLUSH_INTERVAL_SECONDS",
				"APP_BASE_URL",
			])
		);
	});

	it("warns about partially configured OAuth pairs", () => {
		const result = validateApiEnv({
			...VALID_ENV,
			BETTER_AUTH_GOOGLE_ID: "client-id",
			BETTER_AUTH_GITHUB_ID: "github-id",
		});
		expect(result.warnings.join("\n")).toMatch(/Google OAuth/);
		expect(result.warnings.join("\n")).toMatch(/GitHub OAuth/);
	});

	it("accepts the legacy Google pair as a fallback", () => {
		const result = validateApiEnv({
			...VALID_ENV,
			BETTER_GOOGLE_CLIENT_ID: "legacy-id",
			BETTER_GOOGLE_CLIENT_SECRET: "legacy-secret",
		});
		expect(result.warnings.join("\n")).not.toMatch(/Google OAuth/);
	});

	it("warns when optional integrations are unset", () => {
		const result = validateApiEnv({
			...VALID_ENV,
			REMINI_API_BASE_URL: "",
			REMINI_WSS_BASE_URL: "",
			BILLING_CRON_SECRET: "",
		});
		expect(result.warnings.join("\n")).toMatch(/Remini endpoints/);
		expect(result.warnings.join("\n")).toMatch(/BILLING_CRON_SECRET/);
	});
});

describe("assertApiEnv", () => {
	it("throws one actionable error when required values are missing", () => {
		expect(() => assertApiEnv({})).toThrow(
			/Invalid environment configuration/
		);
		try {
			assertApiEnv({});
		} catch (error) {
			expect(String(error)).toMatch(/apps\/api\/\.env\.example/);
		}
	});

	it("returns the validation result when the config is valid", () => {
		expect(assertApiEnv(VALID_ENV).missing).toEqual([]);
	});
});

describe("env allowlist", () => {
	it("covers every boot-required key", () => {
		for (const key of BOOT_REQUIRED_KEYS) {
			expect(ENVS).toContain(key);
		}
	});

	it("covers every package-owned key group", () => {
		for (const keys of Object.values(PACKAGE_ENV_KEYS)) {
			for (const key of keys) {
				expect(ENVS).toContain(key);
			}
		}
	});

	it("has no duplicate entries", () => {
		expect(new Set(ENVS).size).toBe(ENVS.length);
	});
});

describe("formatEnvProblems", () => {
	it("summarises missing, invalid and warning entries", () => {
		const message = formatEnvProblems({
			missing: ["A", "B"],
			invalid: [{ key: "C", message: "bad" }],
			warnings: ["careful"],
		});
		expect(message).toMatch(/2 missing, 1 invalid/);
		expect(message).toMatch(/missing: A, B/);
		expect(message).toMatch(/invalid C: bad/);
		expect(message).toMatch(/- careful/);
	});
});
