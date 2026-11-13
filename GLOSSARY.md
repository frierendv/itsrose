# ItsRose

ItsRose sells metered access to third-party media and AI services. This
glossary names the concepts the platform trades in: what a customer buys, what
a payment settles, what a tenant consumes, and how the upstream services
answer. It records the language, not the implementation.

## Language

### Plans and access

**Plan**:
A purchasable offering that pairs a price and billing interval with a quota, a
rate limit, and a feature list. A Plan is mutable — its price can change while
its identity stays the same.
_Avoid_: Product, Package, Offering

**Tier**:
The ranked identity of a Plan — free, hobby, pro, business. A Subscription
points at a Tier, and comparisons between Tiers are made on rank, never on
price.
_Avoid_: Plan, Level

**Price**:
The amount, currency, and billing interval attached to a Plan.
_Avoid_: Rate, Fee, Cost

**Quota**:
The number of billable requests a Plan allows per billing period. Unlimited
when absent.
_Avoid_: Limit, Credit

**Rate Limit**:
The request rate a Plan permits within a time window.
_Avoid_: Quota, Throttle

**Entitlement**:
Everything a Subscription grants — its Tier, its quota, and its rate limit. A
Subscription grants entitlement or it does not.
_Avoid_: Access, Permission

### Subscriptions and periods

**Subscription**:
A grant of a Tier to a user or tenant over a bounded billing period.
_Avoid_: Membership, Seat

**Billing Period**:
The window a Subscription covers, running from `period_start` to `period_end`.
_Avoid_: Cycle, Term

**Renewal**:
A Subscription's billing period rolling over — `period_end` moves, the Tier
does not.
_Avoid_: Recharge, Top-up

**Upgrade**:
Moving to a higher Tier, effective immediately, with the difference settled by
proration in the same transaction.
_Avoid_: Change, Switch

**Downgrade**:
Moving to a lower Tier. It takes effect at the end of the current billing
period, not immediately.
_Avoid_: Change, Switch

**Grace Period**:
The window after a billing period ends during which access continues while a
renewal payment is still pending.
_Avoid_: Buffer, Extension

### Money

**Invoice**:
A request for payment raised against a customer, and the local record of the
provider invoice it corresponds to.
_Avoid_: Bill, Charge, Transaction

**Invoice Type**:
Why an Invoice exists — a new purchase, an upgrade, a renewal, or usage.
_Avoid_: Kind, Category

**Invoice Status**:
The lifecycle state of an Invoice — draft, pending, published, expired,
overdue, paid, voided, rejected, or canceled. An Invoice is in exactly one of
these.
_Avoid_: State, Flag, Payment Status

**Transaction Status**:
The payment processor's view of a charge — authorize, capture, settlement,
deny, pending, cancel, refund, partial refund, chargeback, partial chargeback,
expire, or failure. Distinct from Invoice Status; a charge can be settled
while the invoice that requested it is not yet paid.
_Avoid_: Invoice Status, Payment Status

**Void**:
Cancelling an Invoice with the provider before it is paid.
_Avoid_: Cancel, Refund

**Settlement**:
The act of applying a confirmed payment to a Subscription — advancing the
billing period and, when the payment bought a change, moving the Tier.
_Avoid_: Application, Posting

**Usage Settlement**:
Converting metered usage into an Invoice. Distinct from Settlement, which
applies a payment rather than raising one.
_Avoid_: Settlement, Reconciliation

**Proration**:
The credit or charge for the unused remainder of a billing period when the
Tier changes mid-period.
_Avoid_: Adjustment, Top-up

**Cycle Reset**:
The case where proration is waived because the new billing period starts
fresh instead of mid-period.
_Avoid_: Free Upgrade

**Notification**:
The payment provider's webhook payload reporting the state of a charge.
_Avoid_: Webhook, Callback, Event

**Signature**:
The provider's HMAC over a Notification's fields, proving it was not tampered
with.
_Avoid_: Checksum, Hash

### Tenancy and metering

**Tenant**:
The account that owns Subscriptions and usage — either personal (one user) or
an organization (many members).
_Avoid_: Account, Organization, Workspace

**Usage**:
Metered consumption of the API, counted per endpoint and per tenant.
_Avoid_: Consumption, Traffic

**Ledger**:
The durable record of usage events, before aggregation.
_Avoid_: Log, History

**Rollup**:
Usage aggregated over a day or window, and the unit that usage settlement
bills.
_Avoid_: Summary, Aggregate

### Platform

**API Key**:
A credential that authenticates a machine caller as a specific user and
carries that user's entitlement.
_Avoid_: Token, Secret

**Feature Package**:
The typed client wrapper around one upstream service, owning that service's
request and response schemas.
_Avoid_: Client, SDK

**Upstream Service**:
A third-party media or AI API that the platform calls on a user's behalf.
_Avoid_: Provider, Vendor

**Delivery Format**:
Whether returned media is delivered inline as base64 or uploaded and
referenced by URL.
_Avoid_: Response Mode
