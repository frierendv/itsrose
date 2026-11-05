/**
 * Environment keys consumed by the Midtrans client.
 *
 * `MIDTRANS_SERVER_KEY` is required to construct the client; the other keys
 * select the environment and optional merchant identity.
 */
export const MIDTRANS_ENV = {
	environment: "MIDTRANS_ENVIRONMENT",
	merchantId: "MIDTRANS_MERCHANT_ID",
	serverKey: "MIDTRANS_SERVER_KEY",
	clientKey: "MIDTRANS_CLIENT_KEY",
} as const;

export const MIDTRANS_ENV_KEYS = [
	MIDTRANS_ENV.environment,
	MIDTRANS_ENV.merchantId,
	MIDTRANS_ENV.serverKey,
	MIDTRANS_ENV.clientKey,
] as const;
