import type { HttpPromise } from "@itsrose/http-client";
import type { MidtransApiError } from "../client/error";
import type {
	InvoiceRequest,
	InvoiceResponse,
	InvoiceVoidResponse,
} from "../schema/invoice";
import type { RequestOptions } from "../typings";
import { BaseService } from "./service";

/**
 * Midtrans Invoice API service for creating and managing hosted digital invoices.
 */
export class Invoice extends BaseService {
	/**
	 * Create a digital invoice.
	 *
	 * `POST /v1/invoices`
	 * @see https://docs.midtrans.com/reference/create-invoice
	 */
	public create(
		body: InvoiceRequest,
		opts?: RequestOptions
	): HttpPromise<InvoiceResponse, MidtransApiError> {
		return this.http.post<InvoiceResponse>(
			"/v1/invoices",
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Get details of an existing invoice.
	 *
	 * `GET /v1/invoices/{invoiceId}`
	 * @see https://docs.midtrans.com/reference/get-invoice
	 */
	public get(
		invoiceId: string,
		opts?: RequestOptions
	): HttpPromise<InvoiceResponse, MidtransApiError> {
		return this.http.get<InvoiceResponse>(
			`/v1/invoices/${invoiceId}`,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Void an invoice. Only invoices with PENDING or OVERDUE status can be voided.
	 *
	 * `PATCH /v1/invoices/{invoiceId}/void`
	 * @see https://docs.midtrans.com/reference/void-invoice
	 */
	public void(
		invoiceId: string,
		opts?: RequestOptions
	): HttpPromise<InvoiceVoidResponse, MidtransApiError> {
		return this.http.patch<InvoiceVoidResponse>(
			`/v1/invoices/${invoiceId}/void`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}
}
