import type { GenericEndpointContext } from "better-auth";
import type { BillingRepositories, BillingUnitOfWork } from "../domain/ports";
import { createBillingRepositories } from "./repository";

/**
 * Better Auth transaction adapter implementing the unit-of-work port.
 *
 * Drivers without transaction support transparently fall back to the base
 * repository set (same semantics as the previous inline implementation).
 */
export function createBillingUnitOfWork(
	ctx: GenericEndpointContext,
	repositories: BillingRepositories = createBillingRepositories(ctx)
): BillingUnitOfWork {
	return {
		repositories,
		async run(work) {
			const adapter = ctx.context.adapter;

			if (typeof adapter.transaction !== "function") {
				return work(repositories);
			}

			return adapter.transaction(async (transactionAdapter) => {
				const transactionContext = {
					...ctx,
					context: {
						...ctx.context,
						adapter: transactionAdapter,
					},
				} as GenericEndpointContext;

				return work(createBillingRepositories(transactionContext));
			});
		},
	};
}
