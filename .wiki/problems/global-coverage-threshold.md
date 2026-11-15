# A global coverage threshold hides holes

**Observed 2026-11-14.**

## The shape

`jest.config.ts` sets one global threshold: 80% for branches, functions,
lines and statements. There is no per-package floor.

A global number is an average, and an average is a statement about the whole
tree, not about any module in it. It says nothing about whether the module you
are about to change is tested.

## What it hid

At `70ab174`, the following sat far below the global line:

| Module                                                  | Function coverage |
| ------------------------------------------------------- | ----------------- |
| `packages/auth/usage/src/adapter/redis.ts` (478 lines)  | 20.08%            |
| `packages/auth/usage/src/application/settlement.ts`     | 15.26%            |
| `packages/auth/billing/src/domain/invoice.service.ts`   | 36.36%            |
| `packages/auth/billing/src/domain/permissions.ts`       | 0%                |
| `packages/auth/billing/src/application/plan.service.ts` | 16.66%            |

`settleUsagePeriod` is the deepest module in the usage package — a flat input
hides period defaulting, plan gating, rate resolution as of the period start,
frozen-settlement idempotency, checksum stamping, invoice issuance with an
idempotency key, and per-tenant error isolation behind it — and it had no
tests at all.

## The consequence

Cutting three well-covered packages on 2026-11-14 (`2786b2b`) dropped global
function coverage to 79.69%, and the gate went red. The honest reading is that
the removed packages had been carrying the average. The fix chosen was to
test the modules that were actually untested, which raised coverage to 81.46%
functions / 90.11% lines and closed two of the gaps above.

Lowering the threshold would have been the cheaper fix and the dishonest one.

## Update, 2026-11-15: there is no threshold at all

The Vitest migration (`refactor/vitest-migration`, `059bd53`) removed the
coverage thresholds rather than porting them — the floors were measured against
Jest's numbers and Vitest counts glob-matched files into the global threshold,
so carrying them across would have made the gate assert something false.

The state this page describes is therefore not "a global threshold that hides
holes" any more. It is **no threshold**, which hides the same holes more
quietly: a module can lose all its coverage and the gate stays green.

Re-measuring the twelve per-path floors against Vitest and adding them back is
the outstanding work. See
[Moving from Jest to Vitest](../decisions/vitest-migration.md).

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
