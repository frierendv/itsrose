import type { CoreError } from "../schema/error";
import type { RequestOptions } from "../typings/request-options";
import { SharedClient } from "./shared";

export class Subscription extends SharedClient<CoreError> {
	/**
	 * Creates a subscription for recurring payments by submitting the required
	 * subscription details, including the name, amount, currency, payment type,
	 * payment token, and billing schedule.
	 *
	 * On success, the API returns the created subscription details, including
	 * its unique ID and current status (`active`).
	 *
	 * ### Idempotency
	 *
	 * This endpoint supports idempotent subscription creation through an
	 * idempotency key. Repeated requests using the same key within the
	 * idempotency window return the same response, preventing duplicate
	 * subscriptions from being created.
	 *
	 * The request body is validated before the idempotency check is performed.
	 * Consequently, requests with an invalid body may fail validation even
	 * when their idempotency key has been used previously.
	 *
	 * The idempotency window is **3 minutes** for each key. To create a new
	 * subscription, use a different idempotency key.
	 */
	public create<T extends object, R = unknown>(
		body: T,
		opts?: RequestOptions
	) {
		return this.http.post<R>(
			"/v1/subscriptions",
			body,
			this.resolveRequestOptions(opts)
		);
	}
	/**
	 * Retrieve the subscription details of a customer using the subscription ID.
	 */
	public get<T extends string, R = unknown>(
		subscriptionId: T,
		opts?: RequestOptions
	) {
		return this.http.get<R>(
			`/v1/subscriptions/${subscriptionId}`,
			this.resolveRequestOptions(opts)
		);
	}
	/**
	 * Disables a customer's subscription using the specified subscription ID to
	 * prevent future subscription charges.
	 *
	 * On success, the API returns a `status_message` indicating that the
	 * subscription details have been updated.
	 *
	 * ### Pending payment retries
	 *
	 * Disabling a subscription does not stop pending payment retries caused by
	 * previous payment failures. These retries will continue to execute after
	 * the subscription has been disabled in an attempt to recover outstanding
	 * payments.
	 *
	 * To disable a subscription and stop all pending payment retries, use
	 * {@link cancel} instead.
	 */
	public disable<T extends string, R = unknown>(
		subscriptionId: T,
		opts?: RequestOptions
	) {
		return this.http.post<R>(
			`/v1/subscriptions/${subscriptionId}/disable`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}
	/**
	 * Cancels a customer's subscription using the specified subscription ID to
	 * prevent future subscription charges.
	 *
	 * On success, the API returns a `status_message` indicating that the
	 * subscription details have been updated.
	 *
	 * ### Pending payment retries
	 *
	 * Unlike disabling a subscription, cancellation also stops pending payment
	 * retries resulting from previous payment failures, such as payment
	 * provider timeouts or insufficient customer balance.
	 *
	 * Use this method when you need to prevent future subscription charges and
	 * stop outstanding payment retry attempts.
	 */
	public cancel<T extends string, R = unknown>(
		subscriptionId: T,
		opts?: RequestOptions
	) {
		return this.http.post<R>(
			`/v1/subscriptions/${subscriptionId}/cancel`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}
	/**
	 * Enables a customer's subscription using the specified subscription ID,
	 * allowing the customer to resume subscription billing immediately.
	 *
	 * On success, the API returns a `status_message` indicating that the
	 * subscription details have been updated.
	 */
	public enable<R = unknown>(subscriptionId: string, opts?: RequestOptions) {
		return this.http.post<R>(
			`/v1/subscriptions/${subscriptionId}/enable`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}
	/**
	 * Updates the details of an existing customer's subscription using the
	 * specified subscription ID.
	 *
	 * On success, the API returns a `status_message` indicating that the
	 * subscription details have been updated.
	 *
	 * ### Reactivating expired subscriptions
	 *
	 * This method can also be used to reactivate expired or inactive subscriptions
	 * by updating their billing schedule.
	 */
	public update<T extends object, R = unknown>(
		subscriptionId: string,
		body: T,
		opts?: RequestOptions
	) {
		return this.http.patch<R>(
			`/v1/subscriptions/${subscriptionId}`,
			body,
			this.resolveRequestOptions(opts)
		);
	}
}
