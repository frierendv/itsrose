import type { HttpPromise } from "@itsrose/http-client";
import type { MidtransApiError } from "../client/error";
import type {
	PaymentLinkDeleteResponse,
	PaymentLinkDetailResponse,
	PaymentLinkRequest,
	PaymentLinkResponse,
} from "../schema";
import type { RequestOptions } from "../typings";
import { BaseService } from "./service";

/**
 * Midtrans Payment Link API service for creating and managing shareable hosted payment links.
 */
export class PaymentLink extends BaseService {
	/**
	 * Create a new payment link.
	 *
	 * `POST /v1/payment-links`
	 * @see https://docs.midtrans.com/reference/create-payment-link
	 */
	public create<T extends PaymentLinkRequest>(
		body: T,
		opts?: RequestOptions
	): HttpPromise<PaymentLinkResponse<T>, MidtransApiError> {
		return this.http.post<PaymentLinkResponse<T>>(
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
	public get(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<PaymentLinkDetailResponse, MidtransApiError> {
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
	public delete(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<PaymentLinkDeleteResponse, MidtransApiError> {
		return this.http.delete<PaymentLinkDeleteResponse>(
			`/v1/payment-links/${orderId}`,
			this.resolveRequestOptions(opts)
		);
	}
}
