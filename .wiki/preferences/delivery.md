# How work is delivered

**Observed 2026-11-14** from the architecture programme and the decisions
taken during it.

## One candidate per PR, each passing the full gate

The user asked for "four separate PRs, each passing the AGENTS.md
verification gate". That produced a commit series where every commit is
independently reviewable and independently revertible — not one large commit
that mixes a retry fix with a package deletion.

The gate, in the order AGENTS.md §5.5 specifies:

```bash
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm test --coverage
```

## Sequencing over picking

When offered seven candidates, the user said: _"All candidate is legit, I can't
just pick one."_ The right response was not to force a choice but to produce a
**wave order with dependencies** — see [the programme](../programme.md). The
value of the review is not the candidate list; it is the ordering.

## Evidence over assertion

Every finding in the programme was verified before it was reported:

- The retry bug was measured against a local stub server (1 attempt vs 4),
  not inferred from reading the condition.
- The regression test was confirmed to **fail against the old policy** —
  expected 3, received 1 — so it is a regression test and not a description of
  the new code.
- The 13 reformatted YAML files were re-parsed and compared to prove the
  change was semantically identical.
- The eager-fetch bug was traced through argument-evaluation order and
  better-auth's eager proxy `apply`.

A claim that has not been checked is not a finding.

## Removing beats adding

Where a fix could be either a new mechanism or a deletion, deletion won:
the browser's proration copy was deleted rather than reconciled; the dead
packages were cut rather than fixed; the catalog price fallback was removed
rather than corrected.

## Honest scoping

When a task was outside the brief — a customer-visible string bug found by a
test, a broken verification gate predating the programme — it was fixed in its
own commit with its own reasoning, not folded silently into a feature commit.

## Related

- [Working agreements](working-agreements.md)
