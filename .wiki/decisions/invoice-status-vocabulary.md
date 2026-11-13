# One invoice-status vocabulary

**Decided 2026-11-14.** Recorded here because the failure it prevents is
silent and costs money.

## The decision

Invoice Status and Transaction Status are two different vocabularies and must
never share a column.

- **Invoice Status** — a billing-domain concept. The lifecycle of an invoice:
  draft, pending, published, expired, overdue, paid, voided, rejected,
  canceled.
- **Transaction Status** — Midtrans vendor vocabulary. The state of a charge:
  authorize, capture, settlement, deny, pending, cancel, refund,
  partial_refund, chargeback, partial_chargeback, expire, failure.

The adapter is the only place that may know Midtrans. It maps the vendor's
transaction status onto the domain's invoice status; the domain then asks
"is this paid?" once, in one place.

Both terms are pinned in [GLOSSARY.md](../../GLOSSARY.md), added at `d5d8a2f`.

## Why

At `70ab174`, `TransactionInvoice.status` was typed as a plain `string` and
received values from three disjoint vocabularies: Midtrans invoice status,
Midtrans transaction status, and a local `"void"` written by the sweeper.

The failure path, in `packages/auth/billing`:

1. `src/domain/webhook.service.ts` fell back to `payload.transaction_status`
   when the gateway read returned no remote data, so `finalStatus` could be
   `"settlement"`.
2. `src/application/webhook.service.ts` gated the subscription settlement on
   `outcome.finalStatus !== "paid"` — a literal that exists only in the
   _invoice_ vocabulary.
3. So a single transient gateway read failure wrote `status: "settlement"` into
   a paid invoice and silently skipped the subscription settlement.
4. The idempotency guard (`isDuplicatePaidWebhook`) stopped recognising the
   invoice as paid.
5. `isVoidableStatus` (`src/domain/invoice.service.ts`) does not list
   `"settlement"`, so a settled invoice became voidable.

The dashboard had already grown its own compensation — `apps/dashboard/features/billing/utils.ts`
tested `status === "paid" || status === "settlement"`. That guess was the leak,
visible in the UI.

## Consequence for callers

A caller of the billing package no longer needs to know that Midtrans has two
status systems. It asks whether an invoice is paid; the domain answers.

## Landed, 2026-11-14

`7ff8fba` — the vocabulary, the mapping, and the single predicate.

The domain owns the vocabulary: `packages/auth/billing/src/domain/invoice-status.ts`
holds a Zod v4 enum of the glossary's Invoice Status set, so the type is
inferred rather than hand-written. `TransactionInvoice.status` is typed as it.

The adapter is the only place that knows Midtrans. It maps the provider's
transaction status and fraud status onto the domain vocabulary using the
gateway's own outcome classifier, so the fraud refinement of `capture`,
`authorize` and `pending` is honoured.

**One predicate answers "is this paid?"** — `isPaidInvoiceStatus`. Both the
domain and the application layer ask through it, so a status is never
compared against a literal in two places that can drift apart. The old
`isVoidableStatus` was replaced rather than kept: a status outside the
vocabulary is now **never voidable**, because voiding is irreversible at the
provider and an invoice in a state this code does not understand should be
left alone rather than cancelled on a guess.

The gateway read no longer aborts the webhook when it fails. The normalised
notification status carries what the domain needs, so a transient upstream
failure can no longer decide whether a customer gets their subscription.

The dashboard's compensation is deleted, and the "is this pending?" predicate
that the admin invoice table had copied verbatim now lives in one place.

### The mapping

| Midtrans outcome                                    | Domain invoice status |
| --------------------------------------------------- | --------------------- |
| `paid` (settlement, capture + accept)               | `paid`                |
| `pending` (authorize, pending, capture + challenge) | `pending`             |
| `failed` (deny, failure)                            | `rejected`            |
| `failed` (cancel)                                   | `canceled`            |
| `failed` (expire)                                   | `expired`             |
| `refunded`                                          | `paid`                |
| `unknown`                                           | `pending`             |

### Two judgement calls, both deliberate

- **A refunded transaction maps to `paid`.** A refund can only follow a
  captured payment, and the invoice vocabulary has no refunded state.
  Reporting `canceled` would erase the payment record of a genuinely settled
  invoice. The refund remains a transaction-level fact.
- **A persisted row holding an unknown status is reported as pending and
  self-heals on the next sync.** The repository has no migration mechanism,
  so rows written before the vocabulary was enforced may still carry `void`.
  The code does not crash on them, and does not treat them as voidable.

### The test surface

`packages/auth/billing/__tests__/invoice-status.test.ts` — 34 tests. The two
that matter most are the ones that fail against the old code: with the fix
reverted, a gateway read that throws or returns nothing leaves the
subscription unsettled, and the invoice status reads `settlement` where it
should read `paid`.

There is also an architectural guard: the test fails if a provider status
literal reappears in the domain or application layer.

## Related

- [Billing subsystem](../subsystems/billing.md)
- [Midtrans client](../subsystems/midtrans.md)
