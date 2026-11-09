import { getEnv, SystemError } from "@itsrose/system";
import {
	API_BASE_URL_PRODUCTION,
	API_BASE_URL_SANDBOX,
	SNAP_BASE_URL_PRODUCTION,
	SNAP_BASE_URL_SANDBOX,
} from "../constants";
import { MIDTRANS_ENV } from "../env";
import type { ClientOptions } from "../typings";
import { MidtransMerchant } from "./merchant";

export type MidtransEnvironment = "production" | "sandbox";

export interface ResolvedClientOptions {
	readonly environment: MidtransEnvironment;
	readonly merchant: MidtransMerchant;
	readonly headers?: ClientOptions["headers"];
	readonly timeout?: number;
}

function normalizeEnvironment(
	value: ClientOptions["environment"]
): MidtransEnvironment {
	return value === "production" ? "production" : "sandbox";
}

function assertUrl(value: string, name: string): void {
	try {
		new URL(value);
	} catch {
		throw new SystemError(
			`Midtrans client option \`${name}\` must be a valid absolute URL: ${value}`
		);
	}
}

/**
 * Resolves the runtime environment.
 *
 * Precedence: `isProduction` > `environment` > `MIDTRANS_ENVIRONMENT` >
 * `"sandbox"`. Contradictory explicit options throw instead of silently
 * picking one.
 */
export function resolveClientEnvironment(
	opts: ClientOptions = {}
): MidtransEnvironment {
	const { isProduction, environment } = opts;

	if (isProduction !== undefined && environment !== undefined) {
		const requested: MidtransEnvironment = isProduction
			? "production"
			: "sandbox";
		if (requested !== normalizeEnvironment(environment)) {
			throw new SystemError(
				"Midtrans client options conflict: `isProduction` and `environment` disagree."
			);
		}
	}

	if (isProduction) {
		return "production";
	}
	if (environment) {
		return normalizeEnvironment(environment);
	}

	const envValue = getEnv(MIDTRANS_ENV.environment, {
		defaultValue: "sandbox",
	});
	return envValue === "production" ? "production" : "sandbox";
}

/**
 * Resolves client options into the normalized shape used by the client.
 */
export function resolveClientOptions(
	opts: ClientOptions = {}
): ResolvedClientOptions {
	const {
		baseUrl,
		snapBaseUrl,
		merchantId,
		serverKey,
		clientKey,
		headers,
		timeout,
	} = opts;

	const environment = resolveClientEnvironment(opts);

	const merchant = new MidtransMerchant({
		merchantId:
			merchantId ??
			getEnv(MIDTRANS_ENV.merchantId, { preprocess: String }),
		serverKey:
			serverKey ?? getEnv(MIDTRANS_ENV.serverKey, { isRequired: true }),
		clientKey: clientKey ?? getEnv(MIDTRANS_ENV.clientKey),
		baseUrl:
			baseUrl ??
			(environment === "production"
				? API_BASE_URL_PRODUCTION
				: API_BASE_URL_SANDBOX),
		snapBaseUrl:
			snapBaseUrl ??
			(environment === "production"
				? SNAP_BASE_URL_PRODUCTION
				: SNAP_BASE_URL_SANDBOX),
	});

	assertUrl(merchant.baseUrl, "baseUrl");
	assertUrl(merchant.snapBaseUrl, "snapBaseUrl");

	return { environment, merchant, headers, timeout };
}
