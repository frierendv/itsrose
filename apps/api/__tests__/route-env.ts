import { vi } from "vitest";

/**
 * The environment the route modules need.
 *
 * The feature clients read their credentials from the environment when they
 * are imported, and the route modules import them. The values are never used;
 * stubbing them keeps the tests off the real environment.
 */
export const ROUTE_ENV: Record<string, string> = {
	CAI_USER_TOKEN: "test-cai-user-token",
	CAI_NEO_BASE_URL: "https://character-ai.test",
	ELEVENLABS_API_KEY: "test-elevenlabs-key",
	MTXX_APP_VERSION: "1.0.0",
	MTXX_SDK_BASE_URL: "https://mtxx-sdk.test",
	MTXX_OPENAPI_BASE_URL: "https://mtxx-openapi.test",
	MTXX_KEY: "test-mtxx-key",
	MTXX_SECRET: "test-mtxx-secret",
	PIXVERSE_API_KEY: "test-pixverse-key",
	PIXVERSE_BASE_URL: "https://pixverse.test",
	REMINI_API_BASE_URL: "https://remini-api.test",
	REMINI_WSS_BASE_URL: "wss://remini-wss.test",
	TIKTOK_TIKWM_BASE_URL: "https://tikwm.test",
	TIKTOK_TIKWM_APIKEY: "test-tikwm-key",
};

/**
 * Stubs the environment the route modules read when they are imported.
 *
 * Import the route modules dynamically after this call: a static import runs
 * before the test body, and the client would read the unstubbed environment.
 */
export const stubRouteEnv = (): void => {
	for (const [key, value] of Object.entries(ROUTE_ENV)) {
		vi.stubEnv(key, value);
	}
};

/**
 * Restores the real environment after a test stubbed it.
 */
export const unstubRouteEnv = (): void => {
	vi.unstubAllEnvs();
};
