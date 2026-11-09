import * as API from "../api";
import type { ClientOptions } from "../typings";
import type { ClientContext } from "./context";
import type { MidtransMerchant } from "./merchant";
import { resolveClientOptions } from "./options";
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
		const resolved = resolveClientOptions(opts);
		this.environment = resolved.environment;
		this.merchant = resolved.merchant;

		const http = createTransport({
			merchant: resolved.merchant,
			headers: resolved.headers,
			timeout: resolved.timeout,
		});
		const context: ClientContext = {
			environment: resolved.environment,
			merchant: resolved.merchant,
			http,
		};

		this.core = new API.Core(context);
		this.snap = new API.Snap(context, this.core);
		this.paymentLink = new API.PaymentLink(context);
		this.invoice = new API.Invoice(context);
	}
}
