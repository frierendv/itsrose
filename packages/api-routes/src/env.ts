import { AUDIO_ENV_KEYS } from "./audio/options";
import { CHARACTER_AI_ENV_KEYS } from "./character-ai/options";
import { INSTAGRAM_ENV_KEYS } from "./instagram/options";
import { MTXX_ENV_KEYS } from "./mtxx/options";
import { PIXVERSE_ENV_KEYS } from "./pixverse/options";
import { REMINI_ENV_KEYS } from "./remini/options";
import { TIKTOK_ENV_KEYS } from "./tiktok/options";

export const API_ROUTE_ENV_KEYS = [
	...AUDIO_ENV_KEYS,
	...CHARACTER_AI_ENV_KEYS,
	...INSTAGRAM_ENV_KEYS,
	...MTXX_ENV_KEYS,
	...PIXVERSE_ENV_KEYS,
	...REMINI_ENV_KEYS,
	...TIKTOK_ENV_KEYS,
] as const;
