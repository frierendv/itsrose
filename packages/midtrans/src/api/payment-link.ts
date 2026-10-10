import type {
	DefaultError,
	PaymentLinkDeleteResponse,
	PaymentLinkDetailResponse,
	PaymentLinkRequest,
	PaymentLinkResponse,
} from "../schema";
import type { RequestOptions } from "../typings";
import { SharedClient } from "./shared";

/**
 * Midtrans Payment Link API service for creating and managing shareable hosted payment links.
 */
export class PaymentLink extends SharedClient<DefaultError> {
	/**
	 * Create a new payment link.
	 *
	 * `POST /v1/payment-links`
	 * @see https://docs.midtrans.com/reference/create-payment-link
	 */
	public create(body: PaymentLinkRequest, opts?: RequestOptions) {
		return this.http.post<PaymentLinkResponse>(
			"/v1/payment-links",
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Get payment link details and purchase history.
	 *
	 * `GET /v1/payment-links/{orderId}`
	 * @see https://docs.midtrans.com/reference/get-payment-link-details
	 */
	public get(orderId: string, opts?: RequestOptions) {
		return this.http.get<PaymentLinkDetailResponse>(
			`/v1/payment-links/${orderId}`,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Delete an existing payment link.
	 *
	 * `DELETE /v1/payment-links/{orderId}`
	 * @see https://docs.midtrans.com/reference/delete-payment-link
	 */
	public delete(orderId: string, opts?: RequestOptions) {
		return this.http.delete<PaymentLinkDeleteResponse>(
			`/v1/payment-links/${orderId}`,
			this.resolveRequestOptions(opts)
		);
	}
}
