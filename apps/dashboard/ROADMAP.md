# Dashboard Recommendations Roadmap

Follow-up work to the dashboard refactor. Each phase is independently shippable;
phases are ordered by value-to-effort, not strictly sequential. All verification
uses the monorepo toolchain (`pnpm --filter dashboard typecheck|lint|build`,
`pnpm test`, CI `qa` + `coverage` jobs).

---

## Phase 0 — Quick wins (no API/package surface changes)

> **Status: ✅ DONE** — 0.1 `Invoice` alias fields removed (package rebuilt, all
> consumers verified), 0.2 `apps/dashboard` Jest project added (4 suites, 29
> tests), 0.3 per-query `staleTime` applied to plans/subscription/invoices.

### 0.1 Remove legacy fields from the `Invoice` alias — `packages/auth/billing`

The dashboard no longer reads `amount_idr` / `payment_url` anywhere, and grep
confirms `packages/auth/billing/src` has **zero internal usages** — the fields
exist only on the `Invoice` alias in `src/types.ts`.

- Delete `amount_idr` and `payment_url` from the `Invoice` alias; keep the alias
  itself (it is the primary type name used across the dashboard) and update the
  "legacy payment fields" doc comment.
- Verify: `pnpm --filter @itsrose/auth-billing typecheck` + root `pnpm typecheck`;
  rebuild the package (`pnpm --filter @itsrose/auth-billing build`) and re-run
  `pnpm --filter dashboard build` (production build resolves `dist` exports).
- Separate commit per the atomic-change policy: `refactor(auth-billing): drop legacy invoice payment fields`.
- **Effort:** S · **Risk:** Low (verified zero consumers).

### 0.2 Dashboard unit tests

Jest is the monorepo framework (root `jest.config.ts`, ts-jest ESM preset), but
its projects only cover `packages/*`. Add an `apps/dashboard` project:

- `jest.config.ts`: new project entry with `testEnvironment: "jsdom"`,
  `setupFilesAfterEnv: ["@testing-library/jest-dom"]`, roots
  `["<rootDir>/apps/dashboard/"]`, `testMatch` for `**/__tests__/**/*.test.ts(x)`,
  and a moduleNameMapper entry `"^@/(.*)$": "<rootDir>/apps/dashboard/$1"` plus the
  existing `@itsrose/*` mappings.
- Dev deps: add `jest`, `ts-jest`, `@testing-library/jest-dom` to `apps/dashboard`
  (or reuse the root catalog versions used by `packages/react`).
- First test targets (pure functions, cheap and high-value):
    - `shared/status-props.test.ts` — all three status mappers incl. fallbacks.
    - `lib/errors.test.ts` — `Error` instances, plain `{ message }` objects, non-objects.
    - `layouts/sidebar/sidebar-nav-utils.test.ts` — `isRouteActive`,
      `hasActiveDescendant`, `getAllDescendantUrls`.
    - `features/billing/utils.test.ts` — re-export sanity of `@itsrose/auth-billing/client`
      formatters (`formatIDR`, `formatDateID`).
    - Later: `features/home` quick-link filtering and a `DataTable` smoke test (Phase 1).
- Verify: `pnpm test` — CI `coverage` job picks the new project up automatically.
- **Effort:** S–M · **Risk:** Low.

### 0.3 Query key `staleTime` tuning

`lib/query-client.ts` sets a global `staleTime: 5000`. Tune per query:

- `billingQueryKeys.plans` → `staleTime: 60 * 60_000` (catalog is stable; still
  invalidated by admin plan mutations).
- `billingQueryKeys.subscription` → `staleTime: 30_000`, invoices → `30_000`
  (billing state changes come from user actions and webhooks; keep short).
- Admin list queries stay short (10–30s); admin tables already refetch on mount.
- **Effort:** XS · **Risk:** Low.

---

## Phase 1 — Shared `DataTable` primitive (dashboard-local)

> **Status: ✅ DONE** — `components/table/data-table.tsx` (generic features
> factory, sort bridging, pagination, filter-bar slot, empty/loading states)
> extracted from the billing invoice table; `table-utils.ts` pure helpers unit
> tested (35 dashboard tests total). Invoice table reduced ~519 → ~330 lines
> with unchanged public props.

`features/billing/components/invoice-table.tsx` (519 lines) is the only TanStack
Table v9 consumer and bundles: features assembly (`tableFeatures`, paginated +
sorted row models), `SortDescriptor ⇄ SortingState` bridging, status/search
filters, pagination footer, and skeleton/empty states. The admin tables use plain
HeroUI tables (different pattern) and only share the empty/loading states already
extracted in `components/table`.

- Extract `components/table/data-table.tsx`:
    - `createTableFeatures()` factory (or export the preassembled `features`) so the
      v9 generic types stay sound.
    - `DataTable<T>` presentational component: HeroUI `Table` + header/body
      rendering, sortable-column bridging, pagination footer, filter bar slot,
      `TableEmptyState`/`TableLoadingState` integration, skeleton variant.
    - `useDataTableState<T>` hook for sorting/pagination state.
- Refactor `features/billing/components/invoice-table.tsx` onto it (expect −250
  lines), keeping its public props (`invoices`, `pageSize`, `showFilters`, …)
  unchanged so `billing-page` and `home-page` call sites don't move.
- Optional follow-up: evaluate migrating `admin/invoices/invoice-table.tsx` to the
  same primitive; leave plans/subscriptions/events tables on plain HeroUI unless a
  second consumer justifies it.
- Verify: `typecheck`, `lint`, `build`, manual smoke of sorting/pagination/filters
  on `/account/billing/invoices`, plus the new unit test from 0.2.
- **Effort:** M · **Risk:** Medium (table UX is the highest-traffic surface —
  keep prop APIs stable, add tests before refactor).

---

## Phase 2 — Server-side prefetch & hydration

> **Status: ✅ DONE** — `lib/api/prefetch.ts` prefetches subscription/plans/
> invoices server-side with `fetchOptions.headers`; home, billing, and invoices
> pages hydrate via `HydrationBoundary` + `dehydrate`. Pages declare
> `export const instant = false` (Next 16 blocking route) since they read
> per-request headers; they render dynamic (ƒ) as intended.

The client-only hooks cause skeleton flashes and a waterfall (page → session →
billing RPCs). The plumbing is already there: `getQueryClient()` is server-safe,
`authClient` RPC methods accept `fetchOptions` (the `proxy.ts` precedent), and
`config.AUTH_BASE_URL` now falls back to the app origin so server-side calls
resolve in any deployment.

- Add a server helper (e.g. `lib/api/prefetch.ts`):
  `prefetchBilling(queryClient)` calling
  `authClient.itsrose.subscription.get({ query: {}, fetchOptions: { headers: await headers() } })`
  (and invoices/plans) inside `queryClient.prefetchQuery` with the same
  `billingQueryKeys` used by the hooks.
- Wrap pages with `HydrationBoundary state={dehydrate(queryClient)}`:
  `app/(dashboard)/page.tsx`, `account/billing/page.tsx`,
  `account/billing/invoices/page.tsx`. Keep the existing `<Suspense>` wrappers
  (required for the `Date.now()` prerender constraint hit during the refactor).
- Skip prefetch on auth-error responses (fall back to client fetch) — reuse
  `withAuthQuery`-style error handling.
- Verify: build + `next dev` with network throttling; confirm zero skeleton flash
  on hard reload and correct cache rehydration in React Query Devtools.
- **Effort:** M · **Risk:** Medium (RSC + better-auth client boundary — validate
  early in a spike branch before wiring all three pages).

---

## Phase 3 — Usage analytics (API + dashboard)

> **Status: ✅ DONE** — new `packages/auth/usage` (`@itsrose/auth-usage`) with
> `usagePlugin` (GET `/usage/stats`, session-guarded) + `usagePluginClient`
> registered in `@itsrose/auth`'s client plugins; `apps/api` writes daily Redis
> counters (`usage:{user_id}:{date}:count|latency_ms`, 90-day TTL) in
> `request-tracker` and injects a Redis-backed `UsageStatsPort` adapter;
> dashboard `features/usage` powers real metric cards (Total Requests, Average
> Latency, Requests Today) on the home page.

The public API already logs `request_start`/`request_end` events with `userId`,
`method`, `url`, and `durationMs` (`apps/api/src/plugins/tracking/request-tracker.ts`)
and has Redis available (rate limiter is Redis-backed). The dashboard home currently
shows only billing data. Add real request/latency metrics:

- **API side (apps/api):**
    - Extend `request-tracker` to increment Redis counters per authenticated user:
      `usage:{user_id}:{YYYY-MM-DD}:count` (INCR), `:latency_ms` (INCRBY), and a
      small TTL policy (e.g. keep 45–90 days for billing/quota context).
    - Expose stats through the **session-guarded surface the dashboard already
      uses** (the better-auth plugin pattern — see `packages/auth/billing`'s
      `/itsrose/*` routes): a `GET /itsrose/usage/stats` endpoint returning
      `{ total_requests, avg_latency_ms, requests_by_day, top_endpoints }` in
      `snake_case`. Decide implementation home: a new small plugin
      (e.g. `packages/auth/usage` following `@itsrose/auth-billing`'s structure with
      `./plugin-server` + `./plugin-client` + `./client` subpaths) — do **not** put
      usage inside the billing plugin (different domain).
    - Keep counter increments out of the request hot path where possible
      (fire-and-forget with error swallowing, or pipeline).
- **Dashboard side:**
    - `features/usage/hooks/use-usage-stats.ts` + `features/usage/query-keys.ts`
      following the feature template from the refactor.
    - Replace the remaining placeholder content in `features/home/home-page.tsx`
      with metric cards (Total Requests, Average Latency, per-day sparkline);
      keep the billing snapshot + quick links.
- **Effort:** L (two apps + new package) · **Risk:** Medium (new package needs
  tsdown entries, client/server isolation per AGENTS.md §3.2, and CI verification).
- Split into two commits: API/package first, dashboard consumption second.

---

## Phase 4 — Extract the sidebar into `@itsrose/react`

> **Status: ✅ DONE** — the 14 sidebar modules moved to
> `packages/react/src/components/sidebar` (exported as `@itsrose/react/sidebar`
> via the existing entry glob), `next/navigation` decoupled via a `pathname`
> prop on `SidebarProvider` (dashboard supplies `useActivePath()`),
> `@gravity-ui/icons` dependency removed from the package (inline SVG trigger
> icon), `@heroui/react` added as an optional peer dependency, and
> `@source "../components"` added to the package styles so consumer Tailwind
> scans the component sources. Dashboard layouts now import from the package.

`components/ui/sidebar` (13 files) is generic and `apps/web` already depends on
both `@itsrose/react` **and** `@heroui/react`, so reuse is real.

- **Decision first:** the sidebar is deeply HeroUI-coupled (`Drawer`, `Disclosure`,
  `Dropdown`, `Chip`, `Surface`), while `@itsrose/react` is HeroUI-free
  (tailwind-variants + react-aria primitives). Options:
    1. **Move as-is with `@heroui/react` as a peer dependency** and a `./sidebar`
       subpath (recommended — lowest effort, immediate parity).
    2. Rebuild on `@itsrose/react/core` primitives (large effort, only worth it if
       apps/web will use the sidebar without HeroUI).
- Package changes: add `entry` for `src/components/sidebar/index.ts` in
  `tsdown.config.ts` (never hand-edit `exports` — AGENTS.md §4.3), declare the
  `@heroui/react` peer dep, add `files` handling, and document `./sidebar` +
  `./sidebar/styles` if needed.
- Move the dashboard's sidebar UI + `use-sidebar-store` + route utils into the
  package (keep layout glue — `AppSidebar`, `SidebarNav`, nav items,
  `constants/sidebar.ts` — in the dashboard), migrate imports, delete the local
  copy.
- Optional: prototype adoption in `apps/web` docs layout.
- Verify: `pnpm --filter @itsrose/react build` (devExports), dashboard `typecheck` +
  `build`, and a visual pass on sidebar expand/collapse/rail/drawer behavior.
- **Effort:** L · **Risk:** Medium–High (shared-package contract change; schedule
  when dashboard churn is low).

---

## Phase 5 — Backlog / smaller items

> **Status: ✅ DONE (investigation outcomes)**
>
> - **Proxy hardening:** per-request `WeakMap` dedupe added to `proxy.ts`; a
>   cross-request TTL cache was evaluated and deliberately rejected (would
>   weaken session-revocation guarantees at the auth boundary). Measured cost
>   remains one session RPC per page load.
> - **PWA polish:** decision recorded — no offline/service-worker story for an
>   authenticated dashboard; manifest already cleaned in the refactor.
> - **Accessibility pass:** static audit completed — tables carry aria-labels,
>   search fields have visible labels, icon-only controls (theme switch, copy
>   button, sidebar trigger) have aria-labels, modals use HeroUI focus traps.
>   No code changes required.

- **Proxy hardening:** `proxy.ts` performs a session RPC on every matched page
  load. Investigate per-request dedupe via React `cache()`, a short in-memory
  session TTL, or the Better Auth cookie-check fast path; measure before changing
  (correctness over premature optimization).
- **PWA polish:** already improved (`display: standalone`, fixed shortcuts);
  remaining: decide whether an offline/service-worker story makes sense for an
  authenticated dashboard (likely "no" — revisit only if requested).
- **Accessibility pass:** run axe/lighthouse on the auth flows and admin tables;
  verify modal focus traps (HeroUI provides them) and table sort announcements.

---

## Sequencing

```
0.1 (package cleanup) ─┐
0.2 (tests)            ├── all independent, can land in parallel
0.3 (staleTime)       ─┘
        │
        ▼
1 (DataTable) ── 2 (prefetch, depends on 0.2's test harness) ── 3 (usage, spans two repos)
        └────────────────────────── 4 (sidebar extraction, schedule separately)
```

- Each phase lands as its own conventional commit(s); phases 3 and 4 are split
  across packages and follow the atomic-change policy.
- Definition of done per phase: `typecheck` + `lint` + `build` (and `test` where
  applicable) green, grep audit for removed symbols, and a manual smoke on the
  affected routes.
