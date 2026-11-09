import type { HttpPromise } from "@itsrose/http-client";
import type { ClientContext } from "../client/context";
import type { MidtransApiError } from "../client/error";
import type {
	CoreTransactionResponse,
	SnapPreference,
	SnapPreferenceResponse,
	SnapTransactionRequest,
	SnapTransactionResponse,
} from "../schema";
import type { RequestOptions } from "../typings";
import type { Core } from "./core";
import { BaseService } from "./service";

/**
 * Midtrans Snap API service for hosted checkout token generation and merchant preference management.
 */
export class Snap extends BaseService {
	readonly #core: Core;

	constructor(ctx: ClientContext, core: Core) {
		super(ctx);
		this.#core = core;
	}

	/**
	 * Retrieve your current Snap Merchant Preference settings.
	 *
	 * `GET /snap/v3/merchant-preferences`
	 */
	public getPreferences(
		opts?: RequestOptions
	): HttpPromise<SnapPreferenceResponse, MidtransApiError> {
		return this.http.get<SnapPreferenceResponse>(
			"/snap/v3/merchant-preferences",
			{
				...this.resolveRequestOptions(opts),
				baseURL: this.snapBaseUrl,
			}
		);
	}

	/**
	 * Update Snap Merchant Preference settings.
	 *
	 * `PATCH /snap/v3/merchant-preferences`
	 */
	public updatePreferences(
		body: SnapPreference,
		opts?: RequestOptions
	): HttpPromise<SnapPreferenceResponse, MidtransApiError> {
		return this.http.patch<SnapPreferenceResponse>(
			"/snap/v3/merchant-preferences",
			body,
			{
				...this.resolveRequestOptions(opts),
				baseURL: this.snapBaseUrl,
			}
		);
	}

	/**
	 * Create new Snap transaction token and hosted redirect URL.
	 *
	 * `POST /snap/v1/transactions`
	 */
	public create(
		body: SnapTransactionRequest,
		opts?: RequestOptions
	): HttpPromise<SnapTransactionResponse, MidtransApiError> {
		return this.http.post<SnapTransactionResponse>(
			"/snap/v1/transactions",
			body,
			{
				...this.resolveRequestOptions(opts),
				baseURL: this.snapBaseUrl,
			}
		);
	}

	/**
	 * Get transaction status; Short for `core.payment.status`
	 */
	public status(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<CoreTransactionResponse, MidtransApiError> {
		return this.#core.payment.status(orderId, opts);
	}
}
