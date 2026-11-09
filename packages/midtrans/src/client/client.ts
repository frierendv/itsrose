import { getEnv } from "@itsrose/system";
import * as API from "../api";
import {
	API_BASE_URL_PRODUCTION,
	API_BASE_URL_SANDBOX,
	SNAP_BASE_URL_PRODUCTION,
	SNAP_BASE_URL_SANDBOX,
} from "../constants";
import { MIDTRANS_ENV } from "../env";
import type { ClientOptions } from "../typings";
import type { ClientContext } from "./context";
import { MidtransMerchant } from "./merchant";
import { createTransport } from "./transport";

/**
 * Midtrans Payment Gateway SDK Client.
 *
 * Provides access to Snap checkout, Core API, Payment Links, Invoicing, and webhook verification.
 */
export class MidtransClient {
	/**
	 * Midtrans client runtime environment.
	 */
	public readonly environment: "production" | "sandbox";

	/**
	 * Representing merchant
	 */
	public readonly merchant: MidtransMerchant;

	/**
	 * Core API service for server-to-server payments and subscriptions.
	 */
	public readonly core: API.Core;

	/**
	 * Snap API service for hosted popup/redirect checkout.
	 */
	public readonly snap: API.Snap;

	/**
	 * Payment Link API service for sharable hosted invoice links.
	 */
	public readonly paymentLink: API.PaymentLink;

	/**
	 * Invoicing API service for digital invoice management.
	 */
	public readonly invoice: API.Invoice;

	constructor(opts: ClientOptions = {}) {
		const {
			isProduction,
			baseUrl,
			snapBaseUrl,
			merchantId,
			serverKey,
			clientKey,
			environment: environmentOption,
			headers,
			timeout,
		} = opts;

		let environment: "production" | "sandbox";
		if (isProduction) {
			environment = "production";
		} else if (environmentOption) {
			environment =
				environmentOption === "production" ? "production" : "sandbox";
		} else {
			const envValue = getEnv(MIDTRANS_ENV.environment, {
				defaultValue: "sandbox",
			});
			environment = envValue === "production" ? "production" : "sandbox";
		}
		this.environment = environment;

		const merchant = new MidtransMerchant({
			merchantId:
				merchantId ??
				getEnv(MIDTRANS_ENV.merchantId, { preprocess: String }),
			serverKey:
				serverKey ??
				getEnv(MIDTRANS_ENV.serverKey, { isRequired: true }),
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
		this.merchant = merchant;

		const http = createTransport({ merchant, headers, timeout });
		const context: ClientContext = { environment, merchant, http };

		this.core = new API.Core(context);
		this.snap = new API.Snap(context, this.core);
		this.paymentLink = new API.PaymentLink(context);
		this.invoice = new API.Invoice(context);
	}
}
