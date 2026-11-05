/**
 * Environment keys consumed by the billing plugin.
 */
export const BILLING_ENV = {
	cronSecret: "BILLING_CRON_SECRET",
} as const;

export const BILLING_ENV_KEYS = [BILLING_ENV.cronSecret] as const;
