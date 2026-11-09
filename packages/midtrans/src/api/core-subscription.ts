import type { HttpPromise } from "@itsrose/http-client";
import type { MidtransApiError } from "../client/error";
import type {
	SubscriptionActionResponse,
	SubscriptionCreateRequest,
	SubscriptionResponse,
	SubscriptionUpdateRequest,
} from "../schema";
import type { RequestOptions } from "../typings";
import { BaseService } from "./service";

export class Subscription extends BaseService {
	/**
	 * Create a recurring subscription.
	 *
	 * `POST /v1/subscriptions`
	 */
	public create(
		body: SubscriptionCreateRequest,
		opts?: RequestOptions
	): HttpPromise<SubscriptionResponse, MidtransApiError> {
		return this.http.post<SubscriptionResponse>(
			"/v1/subscriptions",
			body,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Retrieve a subscription by id.
	 *
	 * `GET /v1/subscriptions/{subscriptionId}`
	 */
	public get(
		subscriptionId: string,
		opts?: RequestOptions
	): HttpPromise<SubscriptionResponse, MidtransApiError> {
		return this.http.get<SubscriptionResponse>(
			`/v1/subscriptions/${subscriptionId}`,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Disable a subscription.
	 *
	 * Disabling stops future charges but keeps pending retries running; use
	 * {@link cancel} to stop those as well.
	 *
	 * `POST /v1/subscriptions/{subscriptionId}/disable`
	 */
	public disable(
		subscriptionId: string,
		opts?: RequestOptions
	): HttpPromise<SubscriptionActionResponse, MidtransApiError> {
		return this.http.post<SubscriptionActionResponse>(
			`/v1/subscriptions/${subscriptionId}/disable`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Cancel a subscription and stop pending payment retries.
	 *
	 * `POST /v1/subscriptions/{subscriptionId}/cancel`
	 */
	public cancel(
		subscriptionId: string,
		opts?: RequestOptions
	): HttpPromise<SubscriptionActionResponse, MidtransApiError> {
		return this.http.post<SubscriptionActionResponse>(
			`/v1/subscriptions/${subscriptionId}/cancel`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Re-enable a disabled subscription.
	 *
	 * `POST /v1/subscriptions/{subscriptionId}/enable`
	 */
	public enable(
		subscriptionId: string,
		opts?: RequestOptions
	): HttpPromise<SubscriptionActionResponse, MidtransApiError> {
		return this.http.post<SubscriptionActionResponse>(
			`/v1/subscriptions/${subscriptionId}/enable`,
			undefined,
			this.resolveRequestOptions(opts)
		);
	}

	/**
	 * Update a subscription. Omitted fields keep their current value.
	 *
	 * `PATCH /v1/subscriptions/{subscriptionId}`
	 */
	public update(
		subscriptionId: string,
		body: SubscriptionUpdateRequest,
		opts?: RequestOptions
	): HttpPromise<SubscriptionActionResponse, MidtransApiError> {
		return this.http.patch<SubscriptionActionResponse>(
			`/v1/subscriptions/${subscriptionId}`,
			body,
			this.resolveRequestOptions(opts)
		);
	}
}
