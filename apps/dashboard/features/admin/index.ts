/**
 * Public surface of the admin feature.
 *
 * Only the page components are exported: they are the sole entry points used
 * outside the feature (the app-router pages under `app/(dashboard)/admin`).
 * Everything else — hooks, components, models, routes, table state, types and
 * utils — is internal to the feature and is reached by relative path from
 * inside `features/admin`.
 */
export { AdminEventsPage } from "./pages/admin-events-page";
export { AdminInvoicesPage } from "./pages/admin-invoices-page";
export { AdminOperationsPage } from "./pages/admin-operations-page";
export { AdminOverviewPage } from "./pages/admin-overview-page";
export { AdminPlansPage } from "./pages/admin-plans-page";
export { AdminRatesPage } from "./pages/admin-rates-page";
export { AdminSettlementsPage } from "./pages/admin-settlements-page";
export { AdminSubscriptionsPage } from "./pages/admin-subscriptions-page";
export { AdminUsersPage } from "./pages/admin-users-page";
