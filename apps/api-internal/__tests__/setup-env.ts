import { vi } from "vitest";

/**
 * The environment the internal route modules need.
 *
 * The feature clients read their credentials from the environment when they
 * are imported, and the route modules import them. The values are never used;
 * stubbing them keeps the tests off the real environment. The character.ai
 * variables are absent on purpose: this application never registers that
 * module, so its client is never imported.
 *
 * This is a setup file, so the environment is in place before a test module -
 * and the static imports it holds - is evaluated.
 */
const ROUTE_ENV: Record<string, string> = {
	ELEVENLABS_API_KEY: "test-elevenlabs-key",
	MTXX_APP_VERSION: "1.0.0",
	MTXX_SDK_BASE_URL: "https://mtxx-sdk.test",
	MTXX_OPENAPI_BASE_URL: "https://mtxx-openapi.test",
	MTXX_KEY: "test-mtxx-key",
	MTXX_SECRET: "test-mtxx-secret",
	REMINI_API_BASE_URL: "https://remini-api.test",
	REMINI_WSS_BASE_URL: "wss://remini-wss.test",
	TIKTOK_TIKWM_BASE_URL: "https://tikwm.test",
	TIKTOK_TIKWM_APIKEY: "test-tikwm-key",
};

for (const [key, value] of Object.entries(ROUTE_ENV)) {
	vi.stubEnv(key, value);
}
