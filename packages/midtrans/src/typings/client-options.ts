import type { Environment } from "./common";
import type { MidtransHeaders } from "./headers";

export interface MerchantOptions {
	/**
	 * Merchant ID
	 *
	 * Defaults to `env["MIDTRANS_MERCHANT_ID"]`
	 *
	 * @type {?string}
	 */
	merchantId?: string;
	/**
	 * Midtrans Server Key.
	 *
	 * Defaults to `env["MIDTRANS_SERVER_KEY"]`.
	 *
	 * @see https://dashboard.midtrans.com/settings/access-keys (Production)
	 * @see https://dashboard.sandbox.midtrans.com/settings/access-keys (Sandbox)
	 */
	serverKey: string;
	/**
	 * Midtrans Client Key.
	 *
	 * Mostly used for client-side Snap.js integrations.
	 *
	 * Defaults to `env["MIDTRANS_CLIENT_KEY"]`.
	 */
	clientKey?: string;
	/**
	 * Override Core and Payment Link API base URL.
	 */
	baseUrl: string;
	/**
	 * Override Snap API base URL.
	 */
	snapBaseUrl: string;
}

export interface ClientOptions extends Partial<MerchantOptions> {
	/**
	 * Midtrans target environment.
	 *
	 * - `production`: Live production transactions
	 * - `sandbox`: Testing sandbox environment
	 * - `development`: Alias for `sandbox`
	 *
	 * Defaults to `env["MIDTRANS_ENVIRONMENT"]` or `"sandbox"`.
	 */
	environment?: Environment;
	/**
	 * Convenient boolean flag to switch to production.
	 * If `true`, overrides `environment` to `"production"`.
	 */
	isProduction?: boolean;
	/**
	 * Custom default headers merged into every request.
	 */
	headers?: MidtransHeaders;
	/**
	 * Default request timeout in milliseconds.
	 * Defaults to `30000` (30 seconds).
	 */
	timeout?: number;
}
