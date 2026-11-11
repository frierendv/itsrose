import type { HttpPromise } from "@itsrose/http-client";
import type { MidtransApiError } from "../../client/error";
import type {
	CoreCaptureRequest,
	CoreChargeResponse,
	CoreDirectRefundRequest,
	CorePaymentChargeRequest,
	CorePaymentRefundRequest,
	CoreStatusB2BResponse,
	CoreTransactionResponse,
} from "../../schema";
import type { RequestOptions } from "../../typings";
import { BaseService } from "../service";

/**
 * Pagination accepted by the B2B status endpoint.
 */
export interface StatusB2BPagination {
	page?: number;
	per_page?: number;
}

export class Payment extends BaseService {
	/**
	 * Perform a transaction charge.
	 *
	 * `POST /v2/charge`
	 */
	public charge(body: CorePaymentChargeRequest, opts?: RequestOptions) {
		return this.http.post<CoreChargeResponse>(
			"/v2/charge",
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Capture an authorized transaction for card payment.
	 *
	 * `POST /v2/capture`
	 */
	public capture(body: CoreCaptureRequest, opts?: RequestOptions) {
		return this.http.post<CoreTransactionResponse>(
			"/v2/capture",
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Approve a transaction with certain `orderId` flagged as challenge by Fraud Detection System.
	 *
	 * `POST /v2/{orderId}/approve`
	 */
	public approve(orderId: string, opts?: RequestOptions) {
		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/approve`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Deny a transaction with a specific `orderId`, flagged as challenge by Fraud Detection System.
	 *
	 * `POST /v2/{orderId}/deny`
	 */
	public deny(orderId: string, opts?: RequestOptions) {
		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/deny`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Cancel a transaction with a specific `orderId` before settlement.
	 *
	 * `POST /v2/{orderId}/cancel`
	 */
	public cancel(orderId: string, opts?: RequestOptions) {
		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/cancel`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Update the transaction status of a specific `orderId` from pending to expired.
	 *
	 * `POST /v2/{orderId}/expire`
	 */
	public expire(orderId: string, opts?: RequestOptions) {
		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/expire`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Refund a settled transaction. Pass `refund_key` on body for idempotency.
	 *
	 * `POST /v2/{orderId}/refund`
	 */
	public refund(
		orderId: string,
		body: CorePaymentRefundRequest,
		opts?: RequestOptions
	): HttpPromise<CoreTransactionResponse, MidtransApiError>;
	public refund(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<CoreTransactionResponse, MidtransApiError>;
	public refund(
		orderId: string,
		body?: CorePaymentRefundRequest | RequestOptions,
		opts?: RequestOptions
	): HttpPromise<CoreTransactionResponse, MidtransApiError> {
		let bodyPayload: CorePaymentRefundRequest | undefined;
		let requestOpts = opts;

		if (body) {
			if ("reason" in body || "amount" in body || "refund_key" in body) {
				bodyPayload = body as CorePaymentRefundRequest;
			} else {
				requestOpts = body as RequestOptions;
			}
		}

		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/refund`,
			bodyPayload,
			this.resolveRequestOptions(requestOpts)
		);
	}

	/**
	 * Send refund directly to the customer's bank or payment provider.
	 *
	 * `POST /v2/{orderId}/refund/online/direct`
	 */
	public directRefund(
		orderId: string,
		body: CoreDirectRefundRequest,
		opts?: RequestOptions
	) {
		return this.http.post<CoreTransactionResponse>(
			`/v2/${orderId}/refund/online/direct`,
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Inquire transaction status of a specific `orderId`.
	 *
	 * `GET /v2/{orderId}/status`
	 */
	public status(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<CoreTransactionResponse, MidtransApiError> {
		return this.http.get<CoreTransactionResponse>(
			`/v2/${orderId}/status`,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Inquire transaction status of multiple B2B transactions related to an orderId.
	 *
	 * `GET /v2/{orderId}/status/b2b`
	 */
	public statusB2B(
		orderId: string,
		pagination?: StatusB2BPagination,
		opts?: RequestOptions
	): HttpPromise<CoreStatusB2BResponse, MidtransApiError>;
	public statusB2B(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<CoreStatusB2BResponse, MidtransApiError>;
	public statusB2B(
		orderId: string,
		pagination?: StatusB2BPagination | RequestOptions,
		opts?: RequestOptions
	): HttpPromise<CoreStatusB2BResponse, MidtransApiError> {
		let paginationConfig: StatusB2BPagination = {};
		let requestOpts = opts;

		if (pagination) {
			if ("page" in pagination || "per_page" in pagination) {
				paginationConfig = pagination as StatusB2BPagination;
			} else {
				requestOpts = pagination as RequestOptions;
			}
		}

		const page = paginationConfig.page ?? 0;
		const perPage = paginationConfig.per_page ?? 10;

		return this.http.get<CoreStatusB2BResponse>(
			`/v2/${orderId}/status/b2b`,
			{
				...this.resolveRequestOptions(requestOpts),
				params: {
					page: page.toString(),
					per_page: perPage.toString(),
				},
			}
		);
	}
}
