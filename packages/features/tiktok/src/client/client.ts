import { createUpstreamClient } from "@itsrose/upstream-client";
import { TIKTOK_TIKWM_BASE_URL, TIKWM_APIKEY } from "../config";

/**
 * The one client the package reaches the TikWM service through.
 */
export const httpClient = createUpstreamClient({
	service: "tiktok",
	baseURL: TIKTOK_TIKWM_BASE_URL,
	headers: { "api-key": TIKWM_APIKEY },
});
