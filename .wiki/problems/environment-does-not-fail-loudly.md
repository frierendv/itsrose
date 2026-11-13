# The environment does not fail loudly

**Observed 2026-11-14.** This page is the general shape behind
[the red gate](gate-red-on-shared-branch.md) and
[the coverage hole](global-coverage-threshold.md). It is the reason the
programme exists rather than a series of one-off fixes.

## The pattern

Three defects in a row had the same shape: **something promised a behaviour,
the environment could not tell whether the promise was kept, and so the
promise was quietly false.**

| Promise                                          | Reality                                  | How it stayed hidden                                                          |
| ------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| "Retries up to 3 times with exponential backoff" | 1 attempt, always                        | The only test asserted the _shape_ of the config, never that a retry happened |
| `prettier --check . && syncpack lint`            | exits non-zero on an invalid flag        | The failure was real, on the shared branch, and nobody looked                 |
| `withAuthQueryFn(promise)`                       | the request started before the query ran | The interface _shape_ permitted the mistake; no test exercised deferral       |

The pattern is not carelessness. It is an environment that answers "does this
compile" rather than "does this do what it says".

## What would force correctness instead

Ranked by leverage, as of 2026-11-14:

1. **A `pre-push` hook running the full gate.** Decided 2026-11-14. This is the
   one that would have caught the red gate before it reached
   `origin/development`. Chosen over a fast subset deliberately: the whole
   gate is what makes "the gate is green" mean something.
2. **A rule that advertised behaviour must be exercised through the public
   interface.** A convention, not a lint rule — but checkable in review: a
   test that asserts a config has the right shape is not a test of the
   behaviour.
3. **Per-package coverage floors**, so a 478-line module at 20% cannot hide
   behind an 80% average.
4. **Interfaces that make the mistake unrepresentable.** The thunk-shaped data
   seam (`a798101`) is the pattern: `withAuthQueryFn` now _cannot_ be handed
   an already-started request.

## The "no workarounds" rule

Fixing a deviation before feature work, rather than around it, is the same
idea. The `--dry-run` flag was a workaround for "I want lint not to write" —
which `lint` already guarantees. Deleting the flag was cheaper than working
around it.

## Related

- [How work is delivered](../preferences/delivery.md)

## Update, 2026-11-14: the pre-push hook exists

The first item on that list was implemented the same day: `.husky/pre-push`
runs the full gate — `format:check`, `lint`, `build`, `typecheck`,
`test --coverage` — before a push leaves the machine. Husky v9 routes it
through `.husky/_/pre-push` → `.husky/_/h` → `sh -e .husky/pre-push`, and
`core.hooksPath` is `.husky/_`.

`AGENTS.md` §5.5 item 4 records the rule for anyone reading the repo cold.
