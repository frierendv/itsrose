import type { ClientContext } from "../../client/context";
import { BaseService } from "../service";
import { Payment } from "./payment";
import { Subscription } from "./subscription";

export * from "./payment";
export * from "./subscription";

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
