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

## Related

- [Billing subsystem](../subsystems/billing.md)
- [Midtrans client](../subsystems/midtrans.md)
