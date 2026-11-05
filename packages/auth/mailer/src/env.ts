/**
 * Environment keys consumed by the Eusend mailer.
 */
export const MAILER_ENV = {
	apiKey: "EUSEND_API_KEY",
	from: "EUSEND_FROM",
} as const;

export const MAILER_ENV_KEYS = [MAILER_ENV.apiKey, MAILER_ENV.from] as const;
