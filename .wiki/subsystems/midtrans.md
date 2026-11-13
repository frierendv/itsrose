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

**Fixed at `8d1f181`.** The signature module now reads the signed fields out
of the raw payload itself, before any parsing, and verifies them there. A
string amount is kept verbatim — reformatting it would make a tampered amount
hash identically to the original — and a JSON number is normalised to the
two-decimal string Midtrans would have sent.

`verifyNotification(payload, schema?)` parses and verifies in one call, so
"verify before you parse" stopped being a caller obligation and became the
module's internal behaviour. The two webhook schemas now share one
`SignedAmountSchema` and cannot disagree about the signed field.

`InvoiceWebhook["gross_amount"]` is now a **string** rather than a number — a
public type change. The billing seam lost its `as never` in the same commit.

## One error model

**Fixed at `3d2d97a`.** The package used to carry two complete descriptions of
the same upstream error payloads. `src/client/error.ts` was the live one — a
hand-written interface plus a normaliser folding four payload shapes into one
kind-tagged error. `src/schema/error/**` (7 files) was a parallel Zod union
that nothing in `src/` imported; only the offline fixture tool did.

They disagreed. A subscription-shaped payload was classified as kind `core` by
the runtime but matched `SubscriptionErrorSchema` in the Zod union. Status
normalisation differed: the runtime fell back to the HTTP status and then 500,
while `CoreErrorSchema` required a 400–599 status with no fallback. And
`src/schema/error/status.ts` still exported a deprecated `HttpStatus` schema
whose success rule (200–299) contradicted the runtime rule
(`BUSINESS_SUCCESS_CODES = {200,201,202,407}`) — and it was reachable from the
root barrel.

The Zod union is now the implementation, in
`src/schema/error/model.ts`. The runtime type is inferred from it, the
classification precedence is the union's member order, and the status and
message chains live inside the model rather than beside it in the transport
layer. The union is **total**: the transport member accepts every input, so
`safeParse` never rejects and every payload has exactly one classification.

This also satisfies AGENTS.md §5.2, which forbids a manual interface next to a
Zod schema for the same payload — the old code did exactly that.

## The status taxonomy

**Fixed at `2025bcc`.** The package declared a twelve-value
`TransactionStatus` enum but the status helpers covered only eight.
`failure`, `chargeback` and `partial_chargeback` were classified by no
predicate at all — so `isFailedStatus("failure")` was **false**.

`classifyTransactionStatus(transactionStatus, fraudStatus?)` is now one
exhaustive classifier returning a discriminated outcome: `paid`, `pending`,
`failed`, `refunded`, `challenged`, `unknown`. The fraud pairing is folded in
— capture plus accept is paid, capture plus challenge is challenged — and an
unrecognised status yields `unknown` rather than silently false. The old
predicates are thin wrappers, so their names and call shapes are unchanged.

The lookup tables are typed against the enum, so a new enum member that
nobody classified is a compile error rather than a runtime surprise.

## Related

- [Billing](billing.md)
- [The environment does not fail loudly](../problems/environment-does-not-fail-loudly.md)
