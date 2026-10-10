import type { MidtransClient } from "../client/client";
import type { CoreError } from "../schema";
import { Payment } from "./core-payment";
import { Subscription } from "./core-subscription";
import { SharedClient } from "./shared";

/**
 * Midtrans Core API service for direct server-to-server payments and transaction lifecycle management.
 */
export class Core extends SharedClient<CoreError> {
	/**
	 * Payment API for performing charge transactions and lifecycle management.
	 */
	public readonly payment: Payment;

	/**
	 * Subscription API for recurring transactions.
	 */
	public readonly subscription: Subscription;

	constructor(client: MidtransClient) {
		super(client);
		this.payment = new Payment(client);
		this.subscription = new Subscription(client);
	}
}
