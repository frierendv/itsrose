/**
 * The feature clients read their credentials from the environment when they
 * are imported. The route module imports them, so the test environment needs
 * the keys to exist - their values are never used.
 */
process.env.ELEVENLABS_API_KEY ??= "test-elevenlabs-key";
process.env.MTXX_APP_VERSION ??= "1.0.0";
process.env.MTXX_SDK_BASE_URL ??= "https://mtxx-sdk.test";
process.env.MTXX_OPENAPI_BASE_URL ??= "https://mtxx-openapi.test";
process.env.MTXX_KEY ??= "test-mtxx-key";
process.env.MTXX_SECRET ??= "test-mtxx-secret";
process.env.REMINI_API_BASE_URL ??= "https://remini-api.test";
process.env.REMINI_WSS_BASE_URL ??= "wss://remini-wss.test";
process.env.TIKTOK_TIKWM_BASE_URL ??= "https://tikwm.test";
process.env.TIKTOK_TIKWM_APIKEY ??= "test-tikwm-key";
