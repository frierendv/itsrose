import { HttpClient, HttpClientError } from "@itsrose/http-client";
import { getEnv } from "@itsrose/system";
import * as API from "../api";
import {
	API_BASE_URL_PRODUCTION,
	API_BASE_URL_SANDBOX,
	DEFAULT_TIMEOUT,
	MAX_REQUEST_SIZE,
	SNAP_BASE_URL_PRODUCTION,
	SNAP_BASE_URL_SANDBOX,
} from "../constants";
import { MIDTRANS_ENV } from "../env";
import { HttpStatus } from "../schema/error/status";
import type { ClientOptions, Environment } from "../typings";
import { errorHandler } from "./error";
import { MidtransMerchant } from "./merchant";

/**
 * Midtrans Payment Gateway SDK Client.
 *
 * Provides access to Snap checkout, Core API, Payment Links, Invoicing, and webhook verification.
 */
export class MidtransClient {
	/**
	 * Midtrans client runtime environment.
	 */
	public readonly environment: Environment;

	/**
	 * Representing merchant
	 */
	public readonly merchant: MidtransMerchant;

	/**
	 * Core API service for server-to-server payments and subscriptions.
	 */
	public readonly core = new API.Core(this);

	/**
	 * Snap API service for hosted popup/redirect checkout.
	 */
	public readonly snap = new API.Snap(this);

	/**
	 * Payment Link API service for sharable hosted invoice links.
	 */
	public readonly paymentLink = new API.PaymentLink(this);

	/**
	 * Invoicing API service for digital invoice management.
	 */
	public readonly invoice = new API.Invoice(this);

	protected readonly [API.SHARED_HTTP_CLIENT]: HttpClient;

	constructor(opts: ClientOptions = {}) {
		const {
			isProduction,
			baseUrl,
			snapBaseUrl,
			merchantId,
			serverKey,
			clientKey,
			...clientOptions
		} = opts;

		let environment: Environment;
		if (isProduction) {
			environment = "production";
		} else if (clientOptions.environment) {
			environment =
				clientOptions.environment === "production"
					? "production"
					: "sandbox";
		} else {
			const envVal = getEnv(MIDTRANS_ENV.environment, {
				defaultValue: "sandbox",
			});
			environment = envVal === "production" ? "production" : "sandbox";
		}
		this.environment = environment;

		this.merchant = new MidtransMerchant({
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

		const mergedHeaders = {
			Accept: "application/json",
			"Content-Type": "application/json",
			...clientOptions.headers,
		};

		this[API.SHARED_HTTP_CLIENT] = new HttpClient({
			...clientOptions,
			onError: errorHandler,
			throwOnError: true,
			maxBodyLength: MAX_REQUEST_SIZE,
			maxContentLength: MAX_REQUEST_SIZE,
			timeout: clientOptions.timeout ?? DEFAULT_TIMEOUT,
			baseURL: this.merchant.baseUrl,
			headers: mergedHeaders,
		});

		this[API.SHARED_HTTP_CLIENT].interceptors.request.use((config) => {
			// make sure is midtrans
			if (this._isMidtransUrl(config.baseURL)) {
				void config.headers.set(
					"Authorization",
					this.merchant.createAuthKey()
				);
			}
			return config;
		});

		this[API.SHARED_HTTP_CLIENT].interceptors.response.use(async (raw) => {
			if (!this._isMidtransUrl(raw.config.baseURL)) {
				return raw;
			}

			const contentType = raw.headers?.["content-type"]?.toString();
			if (!contentType?.includes("application/json")) {
				return raw;
			}
			const rawData = raw?.data || {};
			const rawHeaders = raw.headers;
			const rawStatusCode =
				"status_code" in rawData
					? rawData.status_code
					: "status-code" in rawHeaders
						? rawHeaders["status-code"]
						: raw.status;
			const statusCode = HttpStatus.safeParse(rawStatusCode);
			if (statusCode.data?.success) {
				return raw;
			}

			throw HttpClientError.from(
				"Midtrans Client error. If this message show up it means you or client have done something wrong.",
				raw.config,
				raw.request,
				raw
			);
		});
		Object.defineProperty(this, API.SHARED_HTTP_CLIENT, {
			value: this[API.SHARED_HTTP_CLIENT],
			enumerable: false,
			configurable: false,
			writable: false,
		});
	}

	private _isMidtransUrl(url?: string): boolean {
		if (!url) {
			return false;
		}
		return (
			url === this.merchant.baseUrl || url === this.merchant.snapBaseUrl
		);
	}
}
