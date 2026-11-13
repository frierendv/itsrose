# Billing

`packages/auth/billing` — `@itsrose/auth-billing`. The hexagonal billing
package. As of `70ab174` on `development` of `frierendv/itsrose`.

## Shape

```
src/domain/       pure decision logic — no SDK imports, no pg, no midtrans
src/application/  orchestration — resolves plans, calls the gateway, persists
src/adapter/      raw I/O — midtrans gateway, repositories, storage, unit of work
src/plugin/       better-auth plugin: bindings, routes (thin controllers)
src/client/       browser-safe surface: formatters, the proration view
src/schema/       Zod schemas for the wire
```

AGENTS.md §3.1 is the governing rule: `domain/*` never imports a third-party
SDK, every external interaction is a port in `domain/ports.ts`, and route
handlers stay thin.

## The money path

Midtrans webhook → `plugin/routes/payment/webhook.ts` →
`application/webhook.service.ts` → `domain/webhook.service.ts` →
`adapter/midtrans-gateway.ts` → Midtrans. The subscription is settled inside
the unit-of-work transaction, after the invoice row is updated and an event is
recorded.

The status vocabulary that decides "did this get paid" is
[the invoice-status decision](../decisions/invoice-status-vocabulary.md).

## The invoice-status vocabulary

The domain owns it: `src/domain/invoice-status.ts` holds a Zod v4 enum of the
glossary's Invoice Status set, and `TransactionInvoice.status` is typed as it.
The adapter is the only place that knows Midtrans.

**One predicate answers "is this paid?"** — `isPaidInvoiceStatus`, in the
domain, used by both the domain and the application layer. A status outside
the vocabulary is never paid and never voidable.

Landed at `7ff8fba`. See
[the decision](../decisions/invoice-status-vocabulary.md).

## Things known to be rough, as of 2026-11-14

- **`ClockPort` is declared but is not a seam.** `plugin/bindings.ts` hard-wires
  `systemClock`, and several domain functions keep a `new Date()` fallback, so
  the injected clock cannot reach them. Tests have to monkey-patch the global
  clock with `jest.setSystemTime` to control time. The sibling usage package
  gets this right — do not "fix" billing the way usage would be broken.
- **The domain has no interface.** There is no `src/domain/index.ts`, so every
  export is ambiently importable. Routes and the adapter both reach past the
  application layer straight into the domain, which makes the application layer
  optional — and it is skipped in practice.
- **The two invoice decision tables disagree.** `planInvoiceChange` gates on
  `isActive`; `planUpgradeInvoice` compares tiers without looking at the
  subscription status. For an expired subscription one endpoint opens a fresh
  invoice while the other rejects as "already subscribed". Pinned by a test at
  `a2f8486` so settling it later is a deliberate change.
- **There is no migration mechanism**, so a row persisted before the status
  vocabulary was enforced may still hold a status the code does not know. It
  is reported as pending and self-heals on the next sync rather than
  crashing — but nothing rewrites the stored value.
- **`InvoiceSequenceRepository.next` promises atomicity it does not deliver.**
  The implementation is read-then-write, so two concurrent calls can allocate
  the same invoice number; the retry path salts with `Date.now()`.
- **`domain/errors.ts` is dead.** `BillingDomainError` is defined and never
  thrown or caught anywhere. Every route hand-rolls its own result→HTTP
  mapping instead — 19 switch tables.
- **~13 exports in the application layer are pure pass-throughs** over a
  repository, some taking a `dependencies` bag that is not a dependency.

## Related

- [Midtrans client](midtrans.md)
- [Invoice-status decision](../decisions/invoice-status-vocabulary.md)
- [Proration decision](../decisions/proration-single-rule.md)
