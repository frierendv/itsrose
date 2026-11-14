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

- **The admin barrel exported 124 names** for nine outside consumers, each
  of which imported exactly one page component. **Fixed at `f22d238`** — the
  barrel now exports those nine, and the feature's own files reach their
  internals by relative path.
- **`features/admin/types.ts` hand-declared eight wire interfaces** that
  already exist as Zod schemas in `@itsrose/auth-billing/schema`, a published
  client-safe subpath. **Fixed at `f22d238`** — all eight are now derived
  from the schemas.

    The dashboard has no zod dependency, so `z.input` and `z.infer` are not in
    scope. Both are defined over the `_zod` contract every Zod v4 schema
    exposes, and the schemas are imported with `import type`, so zod never
    enters the browser bundle. The linkage is real, not `any` — reading a field
    that is not on the schema is a compile error.

    `z.input` is used for everything the dashboard _sends_, because the plan
    schemas carry defaults and a form legitimately omits those fields.
    `z.infer` is used for the three list queries, whose `limit` and `offset`
    are coerced: `z.input` types them as `unknown`, which is useless for
    numeric UI state.

- **Invoice-status semantics are encoded in four places**, including a
  verbatim copy of `isPendingInvoice` in the admin invoice table that shadows
  an exported helper in the billing feature.
- **There is no component or hook testing.** `@testing-library/react` is not
  installed, so every `useQuery`/`useMutation` call site and every React
  module is unexercised. The dashboard's own tests cover only pure modules.

## Related

- [Invoice-status decision](../decisions/invoice-status-vocabulary.md)
- [Proration decision](../decisions/proration-single-rule.md)
