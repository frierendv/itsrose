import type { ClientContext } from "../client/context";
import { Payment } from "./core-payment";
import { Subscription } from "./core-subscription";
import { BaseService } from "./service";

/**
 * Midtrans Core API service for direct server-to-server payments and transaction lifecycle management.
 */
export class Core extends BaseService {
	/**
	 * Payment API for performing charge transactions and lifecycle management.
	 */
	public readonly payment: Payment;

	/**
	 * Subscription API for recurring transactions.
	 */
	public readonly subscription: Subscription;

	constructor(ctx: ClientContext) {
		super(ctx);
		this.payment = new Payment(ctx);
		this.subscription = new Subscription(ctx);
	}
}
