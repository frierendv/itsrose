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

## Update, 2026-11-19: the asset library

**Recorded 2026-11-19 at `f25b2c5`** (_feat(dashboard): add the asset
library_).

- `features/assets/` is a fifth vertical slice: list, upload, open and delete
  durable assets served by `apps/api` at `/assets`. It talks to the API origin
  directly with `credentials: "include"` — the session cookie is shared across
  the dashboard and API subdomains — and the server page forwards the incoming
  `headers()` to the API so SSR carries the cookie as well. That blocking
  prefetch is why the route sets `instant = false`.
- Pagination is Prev/Next: the API returns `{ items, limit, offset }` and no
  total, so the UI enables "Next" on a full page.
- The library is the client half of
  [the asset storage policy](../decisions/asset-storage-policy.md); promotion
  has no UI because the studio generation endpoint that would surface a
  `source_key` does not exist yet.

**Superseded 2026-11-19 by `f25b2c5`.** Two statements above stopped being
true with this slice:

- "The dashboard has no zod dependency." It now depends on `zod` at runtime
  (`catalog:` in `apps/dashboard/package.json`) so the asset envelope is
  parsed, not asserted. The `import type` trick on billing schemas is still
  used where it applies, but it is no longer the only option.
- "There is no component or hook testing." `assets-page.test.tsx` renders the
  page with `@testing-library/react` and a mocked `fetch`; the claim held for
  the pre-asset slices, not for this one.

A bug surfaced while adding the page: `proxy.ts` excluded `assets` from the
middleware matcher since `90bca04`, when a `public/assets/` folder existed.
That folder is gone, so the exclusion would have left `/assets` outside the
session gate. The matcher now covers it and the proxy tests assert the gate.
