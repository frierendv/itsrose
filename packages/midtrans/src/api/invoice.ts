// import type {
// 	InvoiceDetailResponse,
// 	InvoiceResponse,
// 	InvoiceVoidRequest,
// 	InvoiceVoidResponse,
// } from "../schema";
import type { DefaultError } from "../schema/error";
import type { MergeWithSchema, NarrowInput } from "../schema/helper";
import type { InvoiceRequest, InvoiceResponse } from "../schema/invoice";
import type { RequestOptions } from "../typings";
import { SharedClient } from "./shared";

/**
 * Midtrans Invoice API service for creating and managing hosted digital invoices.
 */
export class Invoice extends SharedClient<DefaultError> {
	/**
	 * Create a digital invoice.
	 *
	 * `POST /v1/invoices`
	 * @see https://docs.midtrans.com/reference/create-invoice
	 */
	public create<const TBody>(
		body: NarrowInput<TBody, InvoiceRequest>,
		opts?: RequestOptions
	) {
		return this.http.post<MergeWithSchema<InvoiceResponse, TBody>>(
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
	public get<T extends string>(invoiceId: T, opts?: RequestOptions) {
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
	public void<T extends string>(invoiceId: T, opts?: RequestOptions) {
		return this.http.patch<{ success: boolean }>(
			`/v1/invoices/${invoiceId}/void`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}
}
