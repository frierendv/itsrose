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

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
