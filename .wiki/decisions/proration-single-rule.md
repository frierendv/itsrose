# One proration rule

**Decided 2026-11-14.** Landed as `994dd4e`.

## The decision

The server's proration rule is the only rule. The browser does not
reimplement it; it renders a view over the server's result.

## Why

At `70ab174` the upgrade modal recomputed proration in the browser, from a
second copy of the rule and a second set of inputs. The two could not agree.

- **The rule was duplicated.** `packages/auth/billing/src/client/proration.ts`
  reimplemented the three branches of `domain/proration.ts` — the same
  thresholds, the same cycle-reset reasons — with its own result shape and its
  own rounding. The cycle-reset branches rounded on the server and not in the
  browser.
- **The inputs were different.** When the current tier's price was not
  supplied, the preview fell back to `STANDARD_TIER_RATES` — a frozen catalog
  snapshot taken at seed time. The server charges
  `currentPlan.price.amount` from the database. A plan's price is mutable
  through `POST /plan/update`, so once an admin edited a price the modal
  quoted one number and the server charged another.

The dashboard's call site did not pass the current tier's price at all, so the
catalog fallback was the live path, not an edge case.

## How it resolved

`client/proration.ts` became a view over `domain/proration.ts`: one rule, one
set of branch conditions, one rounding. The catalog fallback is gone — the
price is a required parameter, so the type system forces every call site to
supply the price the server will use. The dashboard takes the current tier's
price from the live plan list.

## Test surface

`packages/auth/billing/__tests__/proration-preview.test.ts` pins the preview to
the domain rule and fixes the prorated arithmetic, so the two cannot drift
apart again.

## Related

- [Billing subsystem](../subsystems/billing.md)
- [How work is delivered](../preferences/delivery.md)
