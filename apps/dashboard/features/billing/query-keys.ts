/**
 * React Query key factory for the customer-facing billing surface.
 * Keys are shared between the data hooks and their invalidation sites.
 */
export const billingQueryKeys = {
	all: ["billing"] as const,
	subscription: () => [...billingQueryKeys.all, "subscription"] as const,
	invoices: (status?: string) =>
		[...billingQueryKeys.all, "invoices", status ?? "all"] as const,
	plans: () => [...billingQueryKeys.all, "plans"] as const,
};
