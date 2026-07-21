import { getEnv } from "@itsrose/system";

export const REMINI_API_BASE_URL = getEnv("REMINI_API_BASE_URL", {
	isRequired: true,
});
export const REMINI_WSS_BASE_URL = getEnv("REMINI_WSS_BASE_URL", {
	isRequired: true,
});
