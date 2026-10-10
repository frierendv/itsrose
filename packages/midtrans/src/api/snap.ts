import type {
	DefaultError,
	SnapPreferenceResponse,
	SnapTransactionRequest,
	SnapTransactionResponse,
} from "../schema";
import type { DeepPartial, RequestOptions } from "../typings";
import { SHARED_CLIENT, SharedClient } from "./shared";

/**
 * Midtrans Snap API service for hosted checkout token generation and merchant preference management.
 */
export class Snap extends SharedClient<DefaultError> {
	/**
	 * Retrieve your current Snap Merchant Preference settings.
	 *
	 * `GET /snap/v3/merchant-preferences`
	 */
	public getPreferences(opts?: RequestOptions) {
		return this.http.get<SnapPreferenceResponse>(
			"/snap/v3/merchant-preferences",
			{
				...this.resolveRequestOptions(opts),
				baseURL: this.snapBaseUrl,
			}
		);
	}
	public updatePreferences(
		body: DeepPartial<
			Omit<
				SnapPreferenceResponse,
				"merchant_id" | "customer_imposed_payment_fee" | "feature_types"
			>
		>,
		opts?: RequestOptions
	) {
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
	public create(body: SnapTransactionRequest, opts?: RequestOptions) {
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
	status(orderId: string, opts?: RequestOptions) {
		return this[SHARED_CLIENT].core.payment.status(orderId, opts);
	}
}
