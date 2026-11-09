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

export type CorePaymentChargeResponse = CoreChargeResponse;
export type ChargeResponse = CoreChargeResponse;
export type CaptureRequest = CoreCaptureRequest;
export type CaptureResponse = CoreTransactionResponse;
export type StatusResponse = CoreTransactionResponse;
export type CancelResponse = CoreTransactionResponse;
export type ExpireResponse = CoreTransactionResponse;
export type RefundRequest = CorePaymentRefundRequest;
export type RefundResponse = CoreTransactionResponse;
export type DirectRefundRequest = CoreDirectRefundRequest;
export type StatusB2BResponse = CoreStatusB2BResponse;

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
		return this.http.post<CorePaymentChargeResponse>(
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
	public capture(body: CaptureRequest, opts?: RequestOptions) {
		return this.http.post<CaptureResponse>(
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
		return this.http.post<StatusResponse>(
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
		return this.http.post<StatusResponse>(
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
		return this.http.post<CancelResponse>(
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
		return this.http.post<ExpireResponse>(
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
		body: RefundRequest,
		opts?: RequestOptions
	): HttpPromise<RefundResponse, MidtransApiError>;
	public refund(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<RefundResponse, MidtransApiError>;
	public refund(
		orderId: string,
		body?: RefundRequest | RequestOptions,
		opts?: RequestOptions
	): HttpPromise<RefundResponse, MidtransApiError> {
		let bodyPayload: RefundRequest | undefined;
		let requestOpts = opts;

		if (body) {
			if ("reason" in body || "amount" in body || "refund_key" in body) {
				bodyPayload = body as RefundRequest;
			} else {
				requestOpts = body as RequestOptions;
			}
		}

		return this.http.post<RefundResponse>(
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
		body: DirectRefundRequest,
		opts?: RequestOptions
	) {
		return this.http.post<RefundResponse>(
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
	): HttpPromise<StatusResponse, MidtransApiError> {
		return this.http.get<StatusResponse>(
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
	): HttpPromise<StatusB2BResponse, MidtransApiError>;
	public statusB2B(
		orderId: string,
		opts?: RequestOptions
	): HttpPromise<StatusB2BResponse, MidtransApiError>;
	public statusB2B(
		orderId: string,
		pagination?: StatusB2BPagination | RequestOptions,
		opts?: RequestOptions
	): HttpPromise<StatusB2BResponse, MidtransApiError> {
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

		return this.http.get<StatusB2BResponse>(`/v2/${orderId}/status/b2b`, {
			...this.resolveRequestOptions(requestOpts),
			params: {
				page: page.toString(),
				per_page: perPage.toString(),
			},
		});
	}
}
