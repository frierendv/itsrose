# ItsRose — Engineering Wiki

Tribal knowledge for the `itsrose` monorepo: decisions, how the subsystems are
shaped, and the recurring problems worth not rediscovering.

This is a **historical record**. Every claim is dated and cites the commit it
was true at. For the code itself, the source is the source — this wiki exists
for the things the source does not say.

Written for agents first: a subagent with a fresh context window should be able
to read `index.md` and know where to look.

## Programme

- [Architecture deepening programme](programme.md) — the seven candidates, the
  wave order, and what unlocks what.

## Decisions

- [One invoice-status vocabulary](decisions/invoice-status-vocabulary.md) — why
  Invoice Status and Transaction Status are separate concepts, and the
  subscription that goes unsettled when they are not.
- [One proration rule](decisions/proration-single-rule.md) — the server's rule
  is the only rule; the browser is a view over it.
- [The deletion test applied](decisions/deletion-test-applied.md) — three
  packages cut because nothing called them.
- [A shared HTTP retry contract](decisions/http-retry-contract.md) — what the
  client promised, and what it now actually does.

## Subsystems

- [Billing](subsystems/billing.md) — the hexagonal billing package and the
  money path through it.
- [Midtrans client](subsystems/midtrans.md) — the payment gateway client, its
  competing error models, and the signature invariant.
- [Shared HTTP client](subsystems/http-client.md) — the transport every
  upstream call goes through.
- [Dashboard](subsystems/dashboard.md) — the Next.js app, its feature slices,
  and its data seam.

## Problems

- [The gate was red on the shared branch](problems/gate-red-on-shared-branch.md)
  — a broken verification gate shipped to `origin/development` and nobody
  noticed for a day.
- [A global coverage threshold hides holes](problems/global-coverage-threshold.md)
  — 80% globally, while a 478-line module sat at 20%.
- [The environment does not fail loudly](problems/environment-does-not-fail-loudly.md)
  — the general shape behind the two problems above.

## Preferences

- [How work is delivered](preferences/delivery.md) — one candidate per PR, the
  full gate on every PR, sequencing over picking.
- [Working agreements](preferences/working-agreements.md) — what was asked
  for, and what was asked of me.
