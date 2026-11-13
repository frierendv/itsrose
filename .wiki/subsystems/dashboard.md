# Dashboard

`apps/dashboard` — Next.js 16 / React 19, HeroUI, TanStack Query. The customer
and admin web app. As of `70ab174` on `development` of `frierendv/itsrose`.

## Shape

`app/` holds the App Router segments; every page is about ten lines and
renders one feature page. `features/` holds vertical slices — admin, billing,
usage, home — each with its own pages, components, hooks and barrel.
`components/`, `lib/`, `shared/`, `hooks/`, `layouts/`, `providers/` hold
cross-feature code.

## The data seam

`apps/dashboard/lib/api/with-auth-query.ts` is the single place the API
envelope is unwrapped. `withAuthQuery` takes a promise and returns the data or
throws the error.

`withAuthQueryFn` used to take an already-created promise, which meant the
request started at the call site — before TanStack Query could decide whether
the query was enabled. The admin user popover renders inside every row of the
admin invoice and subscription tables, so each render of a closed popover
issued one admin request. Fixed at `a798101` by making the helper take a
thunk, so deferral is structural.

## Known rough edges, as of 2026-11-14

- **The admin barrel is a 140-declaration wall**, while four of the admin
  feature's genuinely reusable modules (`./query-keys`, `./routes`, `./models`,
  `./table-state`) are excluded from it and reached through deep paths by
  outsiders anyway.
- **`features/admin/types.ts` hand-declares eight wire interfaces** that
  already exist as Zod schemas in `@itsrose/auth-billing/schema`, a published
  client-safe subpath. Drift is already visible: one endpoint sends `user_id`,
  another sends `userId`.
- **Invoice-status semantics are encoded in four places**, including a
  verbatim copy of `isPendingInvoice` in the admin invoice table that shadows
  an exported helper in the billing feature.
- **There is no component or hook testing.** `@testing-library/react` is not
  installed, so every `useQuery`/`useMutation` call site and every React
  module is unexercised. The dashboard's own tests cover only pure modules.

## Related

- [Invoice-status decision](../decisions/invoice-status-vocabulary.md)
- [Proration decision](../decisions/proration-single-rule.md)
