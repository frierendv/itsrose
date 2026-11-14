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
- [The original review](architecture-review.html) — the seven-candidate report
  this programme came out of, with before/after diagrams.

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
- [The gate cannot see most of the codebase](problems/the-gate-cannot-see-most-of-the-codebase.md)
  — the coverage number measured the files that had tests, not the codebase.
- [Mandatory rules that nothing enforces](problems/mandatory-rules-that-nothing-enforces.md)
  — three MANDATORY clauses in AGENTS.md, three rules switched off in the shared ESLint preset.
- [Interfaces that permit misuse](problems/interfaces-that-permit-misuse.md)
  — three bugs where the interface shape allowed it and the test asserted the shape, not the behaviour.
- [Four workspaces outside the net](problems/four-workspaces-outside-the-net.md)
  — including the package that defines the lint preset every other package consumes.
- [The environment does not fail loudly](problems/environment-does-not-fail-loudly.md)
  — the general shape behind all of the above.

## Where the programme stands

As of 2026-11-14, all seven candidates are landed, plus the environment
work the pit-of-success audit asked for. The gate is green: 102 suites, 860
tests.

The coverage gate now measures the whole source tree rather than the files
that happened to have tests, so the number it reports — 49.64% statements
against a 754-file denominator — is the truth rather than a flattering
summary. The `packages/auth/` floor is 58%; the Redis adapter that meters
billable usage went from 0/5 functions to 100%.

See [the programme](programme.md) for the wave order and what each commit
did, and [the environment backlog](backlogs/environment-backlog.md) for what
is still open.

## Backlogs

- [The environment backlog](backlogs/environment-backlog.md) — the ranked list
  of what the environment audit found, with what has been done and what has
  not.

## Preferences

- [How work is delivered](preferences/delivery.md) — one candidate per PR, the
  full gate on every PR, sequencing over picking.
- [Working agreements](preferences/working-agreements.md) — what was asked
  for, and what was asked of me.
