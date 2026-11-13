# Midtrans client

`packages/midtrans` — `@itsrose/midtrans`. The in-house payment-gateway
client. A pure leaf package: no better-auth, no pg, no ioredis.

As of `70ab174` on `development` of `frierendv/itsrose`.

## Shape

```
src/client/      the depth — transport, merchant, options, error normalisation
src/api/         thin endpoint methods over the transport
src/schema/      Zod models of upstream payloads
src/helper/      pure functions — signature, order id, status predicates
src/typings/     manual interfaces
tools/           offline fixture tooling (fixture-verify, fixture-manifest)
fixtures/        a committed corpus of real upstream payloads
```

## The fixture corpus is the evidence base

`packages/midtrans/fixtures/` holds real captured upstream payloads, validated
offline against the schemas by `tools/fixture-verify.ts`. When a question
about upstream behaviour comes up, the answer is usually in there — for
example the committed `gross_amount` appears as the string `"15000.00"` in
`core/charge-credit-card.json` but as the number `15000` in
`invoice/create.json`.

## The signature invariant

Midtrans signs a notification over `order_id + status_code + gross_amount +
serverKey`, where the amount is the **raw 2-decimal string**. The package's
own invoice webhook schema coerced that to a number, so parsing before
verifying produced a different hash and a silent `false`. The one production
consumer escaped the type system with `as never` to stay correct.

See [the decision](../decisions/http-retry-contract.md) for the shape of the
fix, and the Wave 2 task list for where it landed.

## Two competing error models, as of 2026-11-14

`src/client/error.ts` is the live model — a hand-written error interface plus a
normaliser that folds four upstream payload shapes into one kind-tagged error.
`src/schema/error/**` (7 files) is a parallel Zod model of the same payloads
that **nothing in `src/` imports** — only `tools/fixture-manifest.ts` does.
The two classify the same payload differently and normalise status codes by
different rules. `src/schema/error/status.ts` also exported a deprecated
`HttpStatus` schema whose success rule (200–299) contradicted the runtime
rule (`BUSINESS_SUCCESS_CODES = {200,201,202,407}`), and it was still
reachable from the root barrel.

## Related

- [Billing](billing.md)
- [The environment does not fail loudly](../problems/environment-does-not-fail-loudly.md)
