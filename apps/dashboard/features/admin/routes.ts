/**
 * Canonical admin route paths.
 *
 * Used by the sidebar and the navigation consistency test so a renamed route
 * cannot silently leave a dead link behind.
 */
export const ADMIN_ROUTES = {
	commandCenter: "/admin",
	billingPlans: "/admin/billing/plans",
	billingSubscriptions: "/admin/billing/subscriptions",
	billingInvoices: "/admin/billing/invoices",
	billingEvents: "/admin/billing/events",
	accessUsers: "/admin/access/users",
} as const;

export type AdminRoutePath = (typeof ADMIN_ROUTES)[keyof typeof ADMIN_ROUTES];

export const ADMIN_ROUTE_PATHS: readonly AdminRoutePath[] =
	Object.values(ADMIN_ROUTES);
