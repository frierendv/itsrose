import { getEnv } from "@itsrose/system";

export const TIKTOK_TIKWM_BASE_URL = getEnv("TIKTOK_TIKWM_BASE_URL", {
	isRequired: true,
});
export const TIKWM_APIKEY = getEnv("TIKTOK_TIKWM_APIKEY", { isRequired: true });
