/**
 * Environment keys consumed by this package.
 *
 * Exported so applications can build their env allowlist and boot-time
 * validation from one source instead of duplicating names.
 */
export const ELEVENLABS_ENV = {
	apiKey: "ELEVENLABS_API_KEY",
} as const;

export const ELEVENLABS_ENV_KEYS = [ELEVENLABS_ENV.apiKey] as const;
