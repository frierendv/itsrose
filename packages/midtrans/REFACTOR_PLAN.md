# `@itsrose/midtrans` — Refactor, Optimization & Organization Plan

|                 |                                                                                 |
| :-------------- | :------------------------------------------------------------------------------ |
| Status          | Phase 0 complete (guardrails, fixtures, surface test); Phases 1–5 pending       |
| Scope           | `packages/midtrans`                                                             |
| Date            | 2026-11-09                                                                      |
| Evidence        | 5 sandbox probe rounds, 60+ real API calls against `packages/midtrans/.env.dev` |
| Hard constraint | The public `MidtransClient` surface in `src/client/client.ts` must not change   |

> **Phase 0 result (2026-11-09):** the frozen-surface test, 30 sanitized sandbox fixtures,
> offline contract verification, `.env.example` and the dependency cleanup are on
> `refactor/midtrans`. Package statement coverage moved from 15.37% to 88.03%
> because contract tests now load the whole schema barrel; behaviour coverage remains
> Phase 5 work.

> **Phase 1 result (2026-11-09):** services receive a `ClientContext` (`client → api → context`,
> no cycle), the transport lives in `client/transport.ts`, `MidtransMerchant` is exported, the
> `schema/common` family was merged into `schema/shared`, and ~1.2k lines of dead code were
> removed. Duplicate/missing schema exports are now enforced by tests.

> **Phase 2 result (2026-11-09):** transport success is decided by an explicit business-code
> whitelist (`200/201/202/407`), `normalizeMidtransError` never throws and models 401,
> empty-body and subscription errors, and `expire()` / `status()` after expiry now return
> `ok: true`. Fixture-driven transport tests lock the behaviour.

> **Phase 3 result (2026-11-09):** Core transaction responses are discriminated by
> `payment_type` (bank transfer, echannel, cstore, QRIS, ShopeePay, …), plus B2B status,
> Snap preferences, Payment Link create/detail, Invoice void/`virtual_accounts` and
> Subscription request/response schemas. **29 of 30 fixtures are must-pass**; the
> remaining one is an empty transport body covered by the transport tests.

---

## 0. TL;DR

- The package is **4,832 LOC**; **74% of it is schema code** (`src/schema/**`), yet the schemas do not match the real API.
- `tsc`, ESLint and Jest are green, but package coverage is **15.37%** and only `Payment`, `Subscription`, `merchant`, `errorHandler` and status helpers are tested.
- Live sandbox validation of **23 primary schema assertions: 12 pass, 11 fail**. The Payment Link create contract is entirely wrong; Snap preferences fail on three fields; Core transactions only validate for one out of six payment channels.
- Four runtime bugs were reproduced with the real client:
    1. `core.payment.expire()` returns `ok: false` on success (Midtrans business code `407`).
    2. After expiry, `core.payment.status()` returns `ok: false` with `error: undefined`.
    3. `approve()`/`deny()` return `error: {}` (a swallowed `TypeError`).
    4. `errorHandler` throws on any non-object response body.
- Type-level DX is broken: `client.invoice.create(payload)` **does not typecheck** with a valid payload (auth-billing works around it with `payload as never`), `snap.create` rejects `item_details` arrays and `credit_card`/`akulaku`/`other_qris`, and `charge` responses do not expose `va_numbers`.
- The refactor is split into **six phases** (≈7–9 engineer-days), front-loaded with a **client-surface snapshot test** so the frozen contract cannot regress.

---

## 1. Baseline (measured at analysis time)

| Dimension                   | Result                                                                                |
| :-------------------------- | :------------------------------------------------------------------------------------ |
| Total source                | 4,832 lines of TS                                                                     |
| Distribution                | schema 3,577 · api 612 · client 342 · typings 167 · helper 62 · root 72               |
| `tsc --noEmit`              | pass                                                                                  |
| `eslint . --max-warnings 0` | pass                                                                                  |
| Jest                        | 2 suites / 12 tests pass                                                              |
| Coverage (package)          | 15.37% statements · 32.08% branches · 19.87% functions                                |
| CI gate                     | `pnpm lint` → `format:check` → `build` → `typecheck` → `test --coverage` (80% global) |
| Public subpaths             | `.`, `./api`, `./client`, `./env`, `./helper`, `./schema`, `./typings`                |
| Docs                        | `README.md` is a stub: “Please see the source code.”                                  |
| Unused dependency           | `@opentf/obj-diff` (devDependency, zero references)                                   |
| Env file                    | `.env.dev` is correctly gitignored, but no `.env.example` exists                      |
| Build                       | `tsdown` with 7 entries; `exports`/`publishConfig.exports` are tool-managed           |

---

## 2. How the API was verified

`packages/midtrans/.env.dev` (sandbox merchant `G7XXXXXXX` (redacted)) was loaded into the process; every request used
`Basic base64(serverKey + ":")`. Raw responses were captured, then re-parsed with the package's own schemas via
`z.prettifyError`.

Endpoints exercised:

| Area         | Endpoints                                                                                                                                                                                                                                    |
| :----------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core         | `POST /v2/charge` (bca, permata, echannel, qris, gopay, shopeepay, ovo, cstore ×2, credit_card), `GET /v2/{id}/status`, `GET /v2/{id}/status/b2b`, `POST /v2/{id}/{approve,deny,cancel,expire,refund}`, `POST /v2/{id}/refund/online/direct` |
| Snap         | `POST /snap/v1/transactions`, `GET /snap/v3/merchant-preferences`                                                                                                                                                                            |
| Payment Link | `POST /v1/payment-links`, `GET /v1/payment-links/{id}`, `DELETE /v1/payment-links/{id}`                                                                                                                                                      |
| Invoice      | `POST /v1/invoices` (payment link + VA), `GET /v1/invoices/{id}`, `PATCH /v1/invoices/{id}/void`                                                                                                                                             |
| Subscription | `POST /v1/subscriptions`, `GET /v1/subscriptions/{id}`                                                                                                                                                                                       |
| Errors       | 400 validation, 401 unauthorized, 402 channel inactive, 404 missing, 406 duplicate, 412 invalid state                                                                                                                                        |

Not verifiable without a paid/card transaction (tracked as open items):
successful `refund`/`directRefund`, `capture`, FDS `approve`/`deny`, and real invoice/transaction webhooks.

---

## 3. What the real API actually returns

### 3.1 Transport semantics — `status_code` is not HTTP

Core API answers **HTTP 200 even for failures**; the truth is in the body `status_code`:

| Body `status_code` | Meaning (observed)                           | Should be   |
| :----------------- | :------------------------------------------- | :---------- |
| `200`              | Success (status lookup)                      | success     |
| `201`              | Created (charge, snap/invoice also HTTP 201) | success     |
| `407`              | `Success, transaction is expired`            | **success** |
| `404`              | `Transaction doesn't exist.`                 | error       |
| `406`              | Duplicate / state conflict                   | error       |
| `412`              | `Transaction status cannot be updated.`      | error       |
| `400`              | Invalid payload + `validation_messages`      | error       |
| `402`              | `Payment channel is not activated.`          | error       |
| `500`              | Transient upstream failure                   | error       |
| HTTP `401`         | `{"error":"Unauthorized"}`                   | error       |
| HTTP `404`         | Empty body (approve/deny not applicable)     | error       |

The package currently classifies success as `200–299` (see `src/schema/error/status.ts:3`), so `407` is treated as
failure. Confirmed repro: `expire()` returns `{ ok: false, data: { status_code: "407", ... } }`.

### 3.2 Core transaction responses (real fields)

Base fields (charge BCA, 2026-11-09):

```
status_code "201", status_message, transaction_id, order_id, merchant_id,
gross_amount "15000.00", currency "IDR", payment_type "bank_transfer",
transaction_time "2026-11-09 22:55:20", transaction_status "pending",
fraud_status "accept", va_numbers [{ bank: "bca", va_number: "..." }],
expiry_time "2026-11-10 22:55:20"
```

Per-channel deltas observed:

| Channel                   | Extra fields                                                     | Missing vs schema                      |
| :------------------------ | :--------------------------------------------------------------- | :------------------------------------- |
| `bank_transfer` + BCA     | `va_numbers[]`                                                   | `signature_key`                        |
| `bank_transfer` + Permata | `permata_va_number` (no `va_numbers`)                            | `signature_key`, `va_numbers`          |
| `echannel` (Mandiri)      | `bill_key`, `biller_code`                                        | `payment_type` branch, `signature_key` |
| `cstore` (Indomaret/Alfa) | `payment_code`, `store`                                          | `payment_type` branch, `signature_key` |
| `qris`                    | `actions[]`, `acquirer`, `qr_string`                             | `payment_type` branch, `signature_key` |
| `shopeepay`               | `actions[]`, `channel_response_code`, `channel_response_message` | `payment_type` branch, `signature_key` |
| `gopay`                   | (charge failed 500/402 in sandbox)                               | branch missing                         |
| `ovo`                     | channel not activated (402)                                      | branch missing                         |
| `credit_card`             | needs a real card token                                          | branch limited                         |

Other observed responses:

- `GET /v2/{id}/status` adds `signature_key`, `payment_amounts[]`, `expiry_time`; **no** `signature_key` on charge.
- `POST /v2/{id}/expire` returns `407` with `acquirer` and **no** `va_numbers`.
- `GET /v2/{id}/status/b2b` returns `{ status_code, status_message, transactions: [ ... ] }`.
- `fraud_status` can also be `challenge` (FDS); the schema only allows `accept | deny`.
- **Signature formula verified**: `SHA512(order_id + status_code + gross_amount + serverKey) === signature_key` ✓.

### 3.3 Snap

- `POST /snap/v1/transactions` → HTTP 201 `{ token, redirect_url }` (schema ✓).
- `GET /snap/v3/merchant-preferences` real shape differs from the schema:

| Field                 | Real                                                                    | Schema expects            |
| :-------------------- | :---------------------------------------------------------------------- | :------------------------ |
| `allow_retry`         | `boolean \| null` (observed `null`)                                     | `boolean.optional()`      |
| `payment_channels[]`  | `{ name, enabled }`                                                     | `{ name, enable }`        |
| `payment_fee_configs` | **array** of `{ enable, payment_type, customer_percentage, acquirer? }` | object                    |
| `locale`              | `"en"`                                                                  | `enum(id,en) \| string` ✓ |
| `feature_types`       | `[]`                                                                    | `z.array(z.any())`        |

### 3.4 Payment Link

- Create response is **not** `{ payment_link_url, payment_link_id }`:

```json
{
	"order_id": "PROBE-PL-1",
	"payment_url": "https://app.sandbox.midtrans.com/payment-links/...",
	"qr_url": "https://api.sandbox.midtrans.com/v1/payment-links/.../qr-code"
}
```

- Detail response is a large flat object: `payment_link_url`, `qr_url`, `enabled_payments`, `credit_card`,
  `expiry { unit: "months" | "days", duration, start_time }`, `expires_at`, `virtual_account { bca_va, bni_va, ... }`,
  `customer_details | null`, `item_details[]` with `item_id: string | null`, `metadata: string | null`,
  `purchases[]`, both `created_at` and `createdAt` variants, `usage`, `usage_limit`, `source/service/version`.
- Delete response: `{ message }`.
- Expiry units for Payment Link include **plural** forms (`months`) — the shared `ExpiryUnitSchema` rejects them.

### 3.5 Invoice

- `POST /v1/invoices` → **HTTP 201** with the full invoice object (not a thin ack):

```
order_id, invoice_number, invoice_title, invoice_paid_title, published_date,
due_date, invoice_date, paid_date, reference, customer_details{id,name,email,phone,notes},
item_details[{item_id,description,quantity,price,discount_percentage,discount_amount}],
id, status, gross_amount, pdf_url, paid_pdf_url, payment_type, virtual_accounts[],
payment_link_url, amount{vat,discount,shipping,vat_type,total_tax,base_amount},
external_group_id, tax_mode, taxes[], document_type, quotation_*, converted_at,
created_as, shortened_pdf_url, notes, terms_conditions
```

- `PATCH /v1/invoices/{id}/void` → `{ success: true }`.
- Errors: `{ error_messages: ["..."] }` (HTTP 400/404).
- Request quirks discovered:
    - the field is **`virtual_accounts`** (plural); the schema uses `virtual_account` and the API rejects it
      (`"virtual_accounts must not be empty if payment_type is virtual_account"`).
    - `invoice_date` / `due_date` must be ISO-8601 with offset (`2026-11-09T22:00:00+07:00`);
      `"2026-11-09 22:00:00"` is rejected in this environment.
    - `customer_details.phone` accepted `8123456789`; `+628123456789` was rejected by the invoice API.
    - Sandbox validates `due_date` against the current time — fixtures must use relative dates.

### 3.6 Subscription

No schema exists. Real create response:

```json
{
	"id": "…",
	"name": "probe",
	"amount": "15000",
	"currency": "IDR",
	"created_at": "2026-11-09 22:55:33",
	"schedule": {
		"interval": 1,
		"current_interval": 0,
		"interval_unit": "month",
		"start_time": "2026-11-09 22:55:33",
		"previous_execution_at": "…",
		"next_execution_at": "…"
	},
	"status": "active",
	"token": "…",
	"payment_type": "credit_card",
	"transaction_ids": [],
	"retry_schedule": {
		"interval_unit": "hour",
		"max_interval": 3,
		"interval": 1
	}
}
```

- `schedule.start_time` is a **string**, but the schema says `z.number()` (`schema/subscription/shared/subscription-schedule.ts:34`).
- `GET /v1/subscriptions/{unknown}` → HTTP 404 `{ "status_message": "Subscription doesn't exist." }` (no `status_code`).

### 3.7 Error shapes

| Shape                                                        | Endpoints                     | Current handling                        |
| :----------------------------------------------------------- | :---------------------------- | :-------------------------------------- |
| `{ status_code, status_message, id?, validation_messages? }` | Core                          | `CoreErrorSchema` ✓                     |
| `{ error_messages: string[] }`                               | Snap / Invoice / Payment Link | `DefaultErrorSchema` ✓                  |
| `{ status_message, validation_messages }` (no status_code)   | Subscription 400              | falls back, loses `validation_messages` |
| `{ error: "Unauthorized" }`                                  | 401 on any endpoint           | **unmodeled**                           |
| `""` (empty body, HTTP 404)                                  | `approve`/`deny`              | `errorHandler` throws `TypeError`       |
| `{ message }`                                                | Payment Link delete           | schema ✓                                |

---

## 4. Findings

### P0 — Correctness (breaks consumers at runtime or compile time)

| #     | Finding                                                                                                                                                                                                                                                             | Evidence                                                                                                                                         |
| :---- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-1  | Success is inferred from the **body** `status_code` as if it were HTTP; `407` (successful expiry) is treated as failure.                                                                                                                                            | `src/client/client.ts:131-159`, `src/schema/error/status.ts:3-11`; live repro `expire()` → `ok:false`                                            |
| P0-2  | `errorHandler` uses `"order_id" in response`, which throws for `undefined`, `""` and other non-objects; the executor catches the `TypeError` and exposes it as `error`.                                                                                             | `src/client/error.ts:10`; live repro `approve()` → `error:{}`                                                                                    |
| P0-3  | A body with `order_id` is force-treated as success, so `status()` after expiry returns `ok:false` + `error:undefined` — the caller cannot distinguish success from failure.                                                                                         | `src/client/error.ts:10-12`; live repro                                                                                                          |
| P0-4  | Core transaction response schema is wrong in three ways: `signature_key` is **required** but absent on charge/expire; `payment_type` union only covers `bank_transfer` and `credit_card`; `va_numbers` is required for all bank transfers (Permata/expire omit it). | `src/schema/core/responses/transaction-base.ts:57`, `transaction-type-fields.ts:5-8`, `bank-transfer.ts:6`; 8/10 charge payloads fail validation |
| P0-5  | Payment Link create response schema is a different contract (`payment_link_url`/`payment_link_id` vs `payment_url`/`qr_url`).                                                                                                                                       | `src/schema/payment-link/responses/create.ts:8-16`; live probe                                                                                   |
| P0-6  | Snap preferences response schema is wrong on 3 fields (null `allow_retry`, `enabled` vs `enable`, array `payment_fee_configs`).                                                                                                                                     | `src/schema/snap/response.ts:28-49`; live probe                                                                                                  |
| P0-7  | Snap request schema rejects valid payloads: `item_details` must be an **array** (schema expects a single object), `enabled_payments` misses `credit_card`/`akulaku`/`kredivo`/`other_qris`, and `callbacks.unfinish` is removed.                                    | `src/schema/snap/request.ts:17,21,23`; `tsc` errors TS2739, TS2322, TS2561                                                                       |
| P0-8  | `invoice.create` is **unusable from TypeScript**: `NarrowInput<TBody, InvoiceRequest>` collapses `payment_link` to `never`; auth-billing compensates with `payload as never`. The request schema also uses the wrong `virtual_account` field name.                  | `src/api/invoice.ts:17-25`, `src/schema/helper.ts:3-7`, `src/schema/invoice/shared/invoice-payment.ts:63`; `tsc` TS2345/TS2322                   |
| P0-9  | Subscription endpoints are completely untyped (`T extends object, R = unknown`) and have no schemas; `schedule.start_time` is typed as `number` while the API returns a string.                                                                                     | `src/api/core-subscription.ts:29-33`, `src/schema/subscription/shared/subscription-schedule.ts:34`; live captures                                |
| P0-10 | Error union does not model `{ error }` (401), subscription 400 without `status_code`, or non-JSON/empty bodies; the fallback branch flattens the payload and can leak a `TypeError` as `error`.                                                                     | `src/schema/error/*.ts`, `src/client/error.ts`; live captures                                                                                    |
| P0-11 | `Core.payment.capture` takes `Record<string, unknown>`; `statusB2B` returns `Record<string, unknown>`; `status<T>` lets callers assert arbitrary response types.                                                                                                    | `src/api/core-payment.ts:44-50,150-185`                                                                                                          |
| P0-12 | Charge response typing is unusable for payment-specific fields: even for `bank_transfer`, `data.va_numbers` is a compile error because the type is `base & (A                                                                                                       | B)` and does not narrow.                                                                                                                         | `src/schema/core/responses/transaction.ts:5`; `tsc` TS2339 |

### P1 — Organization & architecture

| #     | Finding                                                                                                                                                                                                                                                                                                                                                                       | Evidence                                                                |
| :---- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| P1-1  | Two parallel schema families: `schema/common/**` (public, 567 LOC) and `schema/shared/**` (internal, 382 LOC) define the same concepts with different field sets and identical names (`Metadata`, `Callbacks`, `Expiry`, `ItemDetails`, …).                                                                                                                                   | `src/schema/common/*`, `src/schema/shared/*`                            |
| P1-2  | Two Snap generations coexist: live `snap/request.ts` + `snap/response.ts`, and dead `snap/requests/**` + `snap/responses/**` (221 LOC).                                                                                                                                                                                                                                       | `src/schema/snap/`                                                      |
| P1-3  | Dead code: `snap/requests/**` (158), `snap/responses/**` (63), `core/response.ts` (9), `common/enabled-payments.ts` (24), `shared/transaction/*` (3), plus internally unreferenced exports `DeepRequired`, `NarrowSchemaInput`, `CorePaymentResponseSchema`, `EnabledPayments`, `BankNames`, `ItemDetailsBCAKlikPayExclusive` (rename/deprecate rather than silently delete). | `grep` reference counts                                                 |
| P1-4  | The public schema barrel omits `./shared` and `./subscription`, so `PaymentChannelSchema` and `SubscriptionSchedule` are unreachable from `@itsrose/midtrans/schema` even though other public schemas depend on them.                                                                                                                                                         | `src/schema/index.ts:1-9`                                               |
| P1-5  | `MidtransMerchant` is not exported (`client/index.ts` only exports `client` and `error`), yet `client.merchant` is typed as it.                                                                                                                                                                                                                                               | `src/client/index.ts:1-2`                                               |
| P1-6  | `api/index.ts` re-exports `SHARED_CLIENT`, `SHARED_HTTP_CLIENT` and `SharedClient` — marked `@internal` but public via the root barrel.                                                                                                                                                                                                                                       | `src/api/index.ts`, `src/api/shared.ts:10-12`                           |
| P1-7  | `client.ts` ↔ `api/*` is circular: services import `MidtransClient` (type-only) and the client imports the whole API namespace to reach the HTTP symbol.                                                                                                                                                                                                                      | `src/client/client.ts:3,54`, `src/api/shared.ts`                        |
| P1-8  | Naming convention in `src/schema/README.md` (`[Namespace][Object]Schema`) is followed by `schema/shared/**` and `schema/core/**` but not by `schema/common/**` (`Address`, `Callbacks`, `ItemDetails`, `Metadata`).                                                                                                                                                           | `src/schema/README.md`, `src/schema/common/*`                           |
| P1-9  | `constants.ts` duplicates the four env key strings from `env.ts`; two sources of truth.                                                                                                                                                                                                                                                                                       | `src/constants.ts:21-33`, `src/env.ts:7-12`                             |
| P1-10 | `typings/utility.ts` re-implements `DeepPartial`/`DeepRequired` (the latter unused) instead of using `@itsrose/types`; `typings/index.ts` re-exports `Prettify`/`NarrowInput` from `schema/helper` (layering inversion).                                                                                                                                                      | `src/typings/utility.ts:1-9`, `src/typings/index.ts:8-11`               |
| P1-11 | The same name means different things: public `PaymentChannelBank` = VA names (`bca_va`…), internal `PaymentChannelBank` = bank names (`bca`, `bni`…). Three payment vocabularies exist (`common/enums`, `shared/payment/*`, `core/payment/payment-type-fields`).                                                                                                              | `src/schema/common/enums.ts:20`, `src/schema/shared/payment/bank.ts:22` |
| P1-12 | `TimestampFields` (camelCase `createdAt`) is used for an API response that actually returns **both** `created_at` and `createdAt`; it violates the repo's snake_case API convention.                                                                                                                                                                                          | `src/schema/common/metadata.ts:23-30`, live Payment Link detail         |
| P1-13 | Request and response schemas are coupled: invoice responses are derived with `deepNullable(InvoiceRequestSchema)` and Core responses with `deepNullish(CorePaymentChargeRequestSchema)` — request/response formats differ (`gross_amount` number vs string, added `status_code`/`expiry_time`).                                                                               | `src/schema/invoice/response.ts:57`, `src/schema/core/response.ts:7`    |
| P1-14 | `src/helper` only holds status predicates; signature and order-id logic live inside `MidtransMerchant`, which makes them harder to test or reuse.                                                                                                                                                                                                                             | `src/helper/status.ts`, `src/client/merchant.ts`                        |

### P2 — Quality, DX & docs

| #     | Finding                                                                                                                       |
| :---- | :---------------------------------------------------------------------------------------------------------------------------- |
| P2-1  | Zero-`any` policy is violated: 49 `any` occurrences, including 11 `z.any()` and `any` returns in `schema/helper.ts`.          |
| P2-2  | No runtime validation at all; schemas are type-only despite the package description (“with Zod validation schemas”).          |
| P2-3  | Coverage is 15.37% statements; no tests for `client.ts`, `snap`, `invoice`, `paymentLink`, or any schema/fixture.             |
| P2-4  | `README.md` is a stub; no usage, env, error-model, webhook or sandbox documentation; no `.env.example`.                       |
| P2-5  | Unused devDependency `@opentf/obj-diff`.                                                                                      |
| P2-6  | No `sideEffects: false`; no package `test` script.                                                                            |
| P2-7  | `RequestOptions` has no `signal` (cancellation), no per-request validation switch, and no `params` escape hatch.              |
| P2-8  | `environment` is typed as `Environment` (includes `"development"`) but can only ever be `"production"                         | "sandbox"`. |
| P2-9  | `ClientOptions` is spread wholesale into the Axios config, leaking `environment`/`isProduction` keys into `HttpClient`.       |
| P2-10 | `MAX_REQUEST_SIZE` (16 KB) and `DEFAULT_TIMEOUT` are undocumented and untested.                                               |
| P2-11 | Constants/option resolution (environment precedence, env fallbacks) has no tests.                                             |
| P2-12 | Tests import `Payment`/`Subscription` directly and fake the whole client, so service constructors are effectively frozen too. |

---

## 5. Target architecture

### 5.1 Principles

1. **Freeze the client surface.** Same members, same methods, same `HttpResponse`-style envelope.
2. **One schema per concept.** No `common`/`shared` split; no duplicated names.
3. **Request ≠ response.** Never derive one from the other; they have different shapes.
4. **Transport success vs business status are separate.** HTTP decides transport; a small explicit whitelist decides
   business success (`200`, `201`, `202`, `407`).
5. **Services depend on a context, not on `MidtransClient`.** Removes the cycle and makes services unit-testable.
6. **No `any`.** `unknown` + Zod at the edges.
7. **Fixtures are the contract.** Every public schema has at least one real sandbox fixture.

### 5.2 Proposed file tree

```text
packages/midtrans/
├─ src/
│  ├─ index.ts                      # curated root barrel
│  ├─ client/
│  │  ├─ client.ts                  # FROZEN surface; wires context + services
│  │  ├─ options.ts                 # resolveClientOptions() + environment precedence
│  │  ├─ context.ts                 # ClientContext + internal symbols
│  │  ├─ transport.ts               # HttpClient + auth/response interceptors
│  │  ├─ merchant.ts                # MidtransMerchant (now exported)
│  │  ├─ error.ts                   # normalizeError + deprecated errorHandler alias
│  │  └─ index.ts                   # exports client, merchant, error, options types
│  ├─ api/
│  │  ├─ service.ts                 # BaseService: request(), baseUrl, snapBaseUrl, requestOptions
│  │  ├─ core/{payment,subscription}.ts
│  │  ├─ snap.ts
│  │  ├─ payment-link.ts
│  │  └─ invoice.ts
│  ├─ schema/
│  │  ├─ index.ts
│  │  ├─ primitives/                # amount, datetime, status, payment-channel, expiry,
│  │  │                             # metadata, address, customer, item, callbacks, actions
│  │  ├─ core/{charge-request,transaction-response,lifecycle,status-b2b,subscription}.ts
│  │  ├─ snap/{transaction-request,transaction-response,preference-request,preference-response}.ts
│  │  ├─ payment-link/{create-request,create-response,detail-response,delete-response}.ts
│  │  ├─ invoice/{create-request,response,notification}.ts
│  │  ├─ notification/{transaction}.ts
│  │  └─ error/{api-error,core,default,unauthorized}.ts
│  ├─ helper/{status,signature,order-id}.ts
│  ├─ constants.ts                  # URLs + limits only
│  └─ env.ts                        # env keys only (single source of truth)
├─ fixtures/                        # sanitized, committed sandbox responses + README
├─ tools/{capture-sandbox.ts,sanitize.ts,verify-fixtures.ts}
├─ __tests__/{unit,contract}/…
├─ .env.example
└─ README.md
```

### 5.3 Frozen public contract

```ts
class MidtransClient {
	readonly environment: "production" | "sandbox";
	readonly merchant: MidtransMerchant;
	readonly core: Core;
	readonly snap: Snap;
	readonly paymentLink: PaymentLink;
	readonly invoice: Invoice;
	constructor(opts?: ClientOptions);
}
```

| Member              | Methods (unchanged names/arity)                                                                                                                    |
| :------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `merchant`          | `merchantId`, `clientKey` (non-enumerable), `baseUrl`, `snapBaseUrl`, `createAuthKey()`, `verifySignature(tx)`, `generateOrderId(userId, prefix?)` |
| `core.payment`      | `charge`, `capture`, `approve`, `deny`, `cancel`, `expire`, `refund`, `directRefund`, `status`, `statusB2B`                                        |
| `core.subscription` | `create`, `get`, `disable`, `cancel`, `enable`, `update`                                                                                           |
| `snap`              | `getPreferences`, `updatePreferences`, `create`, `status`                                                                                          |
| `paymentLink`       | `create`, `get`, `delete`                                                                                                                          |
| `invoice`           | `create`, `get`, `void`                                                                                                                            |

Every method keeps returning `HttpPromise<HttpResponse<TData, TError>>`, so `await` still yields
`{ ok, data, status, statusText, headers, config, error? }`.

**Guardrail**: add `__tests__/unit/client-surface.test.ts` that snapshots:

- `Object.keys(client)` (must be exactly `environment, merchant, core, snap, paymentLink, invoice`),
- each service's prototype method names (excluding `constructor` and `#private`),
- `Object.keys(client.merchant)`,
- the URL/method invoked by every method (extend the existing `api.test.ts`).

Type-level generic tricks (`status<T>`, `create<TBody>`, `NarrowInput`) may be replaced by precise types; no in-repo
caller uses explicit generics (verified by grep).

### 5.4 Transport & error model

```ts
// transport.ts
const BUSINESS_SUCCESS = new Set(["200", "201", "202", "407"]);

response interceptor:
  if (!isMidtransJson(response)) return response;
  const code = readBusinessStatus(response);          // body.status_code ?? headers["status-code"]
  if (!code || BUSINESS_SUCCESS.has(code)) return response;
  throw MidtransRequestError.from(response, code);    // executor maps it to HttpResponse.error

// error.ts
function normalizeError(data: unknown, error: HttpClientError): MidtransApiError {
  const body = isRecord(data) ? data : undefined;
  // 1. Core:        { status_code, status_message, id?, validation_messages? }
  // 2. Legacy:      { error_messages: string[] }
  // 3. Unauthorized:{ error: string }
  // 4. Subscription/404: { status_message, validation_messages? } (no status_code)
  // 5. Transport:   empty/plain-text body
  return {
    kind: "core" | "legacy" | "unauthorized" | "transport",
    status_code: toHttpStatus(body?.status_code ?? error.status),
    status_code_raw: body?.status_code,
    status_message, error_messages?, validation_messages?, id?,
    raw: body, cause: error,
  };
}
```

`errorHandler` remains exported as a thin alias so no import breaks; `error.error_messages` stays available for the
existing auth-billing adapter.

### 5.5 Schema conventions

- `XxxSchema` for values, `Xxx` for the inferred type (enforce the existing `src/schema/README.md`, update it).
- One public export per concept. Requests and responses live in separate files.
- Use `z.discriminatedUnion` with **`extend`ed object branches** (never `.and()` for discriminated variants) so
  TypeScript narrows payment-specific fields.
- Response date fields stay **strings** (`"YYYY-MM-DD HH:mm:ss"` and `"YYYY-MM-DD HH:mm:ss +0700"`); do not coerce.
- `gross_amount` is `number` in requests and `string` in responses — never share a schema.
- `fraud_status` includes `challenge`.
- Payment vocabulary consolidated into `primitives/payment-channel.ts`:
  `PaymentTypeSchema` (core `payment_type`), `SnapPaymentMethodSchema`, `BankCodeSchema`, `VaBankSchema`,
  `EwalletSchema`, `CstoreSchema`, `CardlessSchema`.
- Deprecated aliases (one minor cycle) for: `Address`, `Callbacks`, `ItemDetails`, `CustomerDetails`,
  `TransactionDetails`, `Metadata`, `CustomFields`, `PaymentChannels`, `ExpirySchema`, `TransactionStatusSchema`.

### 5.6 Config & environment resolution

```ts
resolveClientOptions(opts): {
  environment: "production" | "sandbox";
  merchant: { merchantId?, serverKey, clientKey?, baseUrl, snapBaseUrl };
  http: { headers, timeout, maxBodyLength, ... };
}
```

- Precedence documented and tested: `isProduction: true` > `environment` > `MIDTRANS_ENVIRONMENT` > `"sandbox"`.
- `development` maps to sandbox.
- `MIDTRANS_ENV` keys are the single source; `constants.ts` no longer duplicates them (deprecated aliases kept).
- `ClientOptions` stays assignable: existing `{ serverKey, clientKey, merchantId, environment, isProduction, headers, timeout }`.

---

## 6. Sandbox-driven schema workflow

1. **Capture** (`tools/capture-sandbox.ts`, run with `tsx --env-file=.env.dev`):
    - refuses to run unless `MIDTRANS_ENVIRONMENT === "sandbox"` and the URL is a `*.sandbox.midtrans.com` host;
    - executes a fixed scenario list, records `{ endpoint, method, request, status, headers, body }`;
    - writes to `fixtures/` with `captured_at`, `merchant`, and `scenario` metadata.
2. **Sanitize** (`tools/sanitize.ts`) — mandatory before commit:
    - `signature_key`, `token`, `snap_token`, `va_number`, `permata_va_number`, `payment_code`, `bill_key`,
      `qr_string`, `transaction_id`, `order_id`, `id`, `merchant_id`, `redirect_url`, `payment_url`, `qr_url`,
      `pdf_url`/`paid_pdf_url`/`shortened_pdf_url` (these are **signed URLs containing STS credentials**),
      `acquirer` references, and all customer PII.
    - replace with deterministic placeholders; keep field presence and JSON types intact.
3. **Verify** (`tools/verify-fixtures.ts` + `__tests__/contract/fixtures.test.ts`):
    - each fixture is parsed by exactly one named schema; mismatch fails CI offline;
    - `fixtures/README.md` records capture date and the sandbox quirks (invoice date/phone format).
4. **Refresh**: quarterly, or when Midtrans changes a contract; bump fixtures in a dedicated commit.
5. **Paid-path fixtures** (open item): seed a settled transaction (sandbox VA simulator or card tokenization with
   `4811 1111 1111 1114`), then capture `refund`, `capture`, `approve`/`deny` and a real notification.

---

## 7. Phased execution plan

| Phase                                   | Goal                                            | Key work                                                                                                                                                                                                                | Exit criteria                                                                                                                         |
| :-------------------------------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **0. Guardrails** (0.5–1 d)             | Freeze contract, make drift visible             | client-surface snapshot test; `fixtures/` + capture/sanitize/verify tools; `.env.example`; remove `@opentf/obj-diff`; baseline numbers in README                                                                        | Surface test fails on any client member edit; `fixtures:verify` runs offline                                                          |
| **1. Restructure** (1–1.5 d)            | Remove duplication & cycles, no behavior change | introduce `ClientContext` + `BaseService`, internalize symbols, export `MidtransMerchant`, merge `common`→`shared` (one family), delete dead code (P1-2/3), fix barrels (P1-4/5), collapse `constants`/`env` duplicates | `tsc`/lint/tests green; surface test unchanged; schema barrel exports every public schema once                                        |
| **2. Transport & errors** (1 d)         | Fix runtime correctness                         | explicit business-success whitelist; non-throwing `normalizeError`; model 401/empty/subscription shapes; tests for 200/201/407/404/412/empty                                                                            | `expire()` → `ok:true`; `status()` after expiry → `ok:true`; `approve()` → structured error                                           |
| **3. Schema rewrite** (2–3 d)           | Make schemas match reality                      | 3a core transactions (+channels) · 3b errors/notification · 3c snap preferences · 3d payment link · 3e invoice (incl. `virtual_accounts`, dates) · 3f subscription; each with fixtures + contract tests                 | 100% fixtures parse; payment-specific fields narrow correctly                                                                         |
| **4. API typing** (1–1.5 d)             | Real request/response types                     | request schemas per endpoint; remove `NarrowInput`/`MergeWithSchema` generics; typed `capture`/`statusB2B`/subscription; `refund` overloads; `RequestOptions.signal`; `ClientOptions` validation                        | `client.invoice.create(payload)` typechecks without `as never`; `snap.create` accepts array + all channels; `data.va_numbers` narrows |
| **5. Docs, tests, perf, release** (1 d) | Ship confidently                                | README + method tables + webhook example; coverage target; bundle/import measurements; `sideEffects:false`; v2 migration notes                                                                                          | `lint`/`format`/`build`/`typecheck`/`test --coverage` green; docs reviewed                                                            |

Ordering is strict `0 → 1 → 2 → 3 → 4 → 5`; phase 3 sub-steps can be parallelized per API surface but each must land
with its fixture test. Estimated total: **7–9 engineer-days**.

---

## 8. Testing strategy

| Layer            | What                                                                                                                | Where                                   |
| :--------------- | :------------------------------------------------------------------------------------------------------------------ | :-------------------------------------- |
| Unit — surface   | client/service/merchant member snapshot, method arities, enumerable keys                                            | `__tests__/unit/client-surface.test.ts` |
| Unit — options   | env precedence matrix, custom URLs, missing server key, `development` mapping                                       | `__tests__/unit/options.test.ts`        |
| Unit — transport | auth header only for Midtrans hosts, success whitelist (200/201/202/407), failure mapping, retry config passthrough | `__tests__/unit/transport.test.ts`      |
| Unit — errors    | all 6 error shapes incl. empty body, string body, unauthorized, subscription 400                                    | `__tests__/unit/error.test.ts`          |
| Unit — helpers   | status predicates, signature (synthetic key), order-id format/collision charset                                     | `__tests__/unit/helpers.test.ts`        |
| Contract         | every fixture × exactly one schema, offline                                                                         | `__tests__/contract/fixtures.test.ts`   |
| Integration      | opt-in (`MIDTRANS_INTEGRATION=1`) real sandbox round-trip, skipped by default                                       | `__tests__/integration/sandbox.test.ts` |
| Type-level       | compile-only assertions for valid/invalid payloads (charged payloads, snap channels, invoice)                       | `__tests__/types/*.ts`                  |

Coverage policy:

- keep the CI 80% gate; exclude declaration-only/barrel files from `collectCoverageFrom` rather than lowering the threshold;
- target ≥80% for `client/**`, `api/**`, `helper/**` (schema coverage comes from contract tests).

---

## 9. Performance & bundle

- Removing `deepNullable`/`deepNullish` derivation (and `schema/helper.ts`'s runtime machinery, ~360 lines) eliminates
  a large amount of schema construction at import time. Replace with explicit, flatter object schemas.
- Prefer `z.object({...base, ...variant})` over `.and()` chains: fewer intersections, faster parse, better inference.
- Delete ~257 lines of dead schema code and the duplicate `common` family (~200+ lines).
- Do **not** enable runtime response validation by default (it would throw on unknown provider changes); expose
  `parseWith(schema, data)` helpers instead. Revisit an opt-in `validateResponses` after fixtures are complete.
- Add `"sideEffects": false`; measure `dist/*.mjs` and `.d.mts` sizes plus cold `import()` time before/after with Sonda.

---

## 10. Release & migration

- Version: **`@itsrose/midtrans@2.0.0`** (schema names/semantics and service constructors change; client surface does not).
- Keep names used by in-repo consumers: `MidtransClient`, `ClientOptions`, `errorHandler`, `InvoiceWebhookSchema`,
  `WebhookPayload`, `InvoiceRequest`, `InvoiceResponse`.
- Deprecated aliases for one minor cycle: old `common/*` names and `HttpStatus`; remove in v3.
- Update `packages/auth/billing/src/adapter/midtrans-gateway.ts` to drop `payload as never` once
  `NarrowInput` is removed (the adapter's `InvoiceCreatePayload` should be structurally assignable).
- Never edit `package.json` `exports` by hand: add `tsdown` entries and run the package build.

---

## 11. Decisions needed

| #   | Decision                                                                      | Recommendation                                                  |
| :-- | :---------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| 1   | Major bump + schema renames, or keep names and only fix internals?            | Major bump + deprecated aliases                                 |
| 2   | Runtime response validation default?                                          | Off; export parse helpers, revisit later                        |
| 3   | Drop `HttpStatus` and public `SHARED_*` symbols?                              | Keep `HttpStatus` deprecated in v2; make symbols internal-only  |
| 4   | Scope of new API coverage (card tokenization, notification helper on client)? | Defer; keep this refactor behavior-preserving except bug fixes  |
| 5   | Commit sanitized fixtures to the repo?                                        | Yes — they are the regression net; sanitization is mandatory    |
| 6   | Coverage policy for `src/schema/**`?                                          | Contract tests + documented exclusions, not threshold reduction |

---

## Appendix A — primary validation matrix (sandbox, 2026-11-09)

| #   | Capture                      | Schema                      | Result                                  |
| :-- | :--------------------------- | :-------------------------- | :-------------------------------------- |
| 1   | charge bank_transfer BCA     | `ResponseTransaction`       | ❌ missing `signature_key`              |
| 2   | charge bank_transfer Permata | `ResponseTransaction`       | ❌ `signature_key`, `va_numbers`        |
| 3   | charge echannel              | `ResponseTransaction`       | ❌ `signature_key`, payment_type branch |
| 4   | charge qris                  | `ResponseTransaction`       | ❌ `signature_key`, payment_type branch |
| 5   | charge shopeepay             | `ResponseTransaction`       | ❌ `signature_key`, payment_type branch |
| 6   | charge cstore Indomaret      | `ResponseTransaction`       | ❌ `signature_key`, payment_type branch |
| 7   | status lifecycle             | `ResponseTransaction`       | ✅                                      |
| 8   | expire lifecycle             | `ResponseTransaction`       | ❌ `signature_key`, `va_numbers`        |
| 9   | status not found             | `CoreErrorSchema`           | ✅                                      |
| 10  | charge invalid body          | `ApiErrorSchema`            | ✅                                      |
| 11  | snap create                  | `SnapTransactionResponse`   | ✅                                      |
| 12  | snap preferences             | `SnapPreferenceResponse`    | ❌ 3 fields                             |
| 13  | payment link create          | `PaymentLinkResponse`       | ❌ wrong contract                       |
| 14  | payment link delete          | `PaymentLinkDeleteResponse` | ✅                                      |
| 15  | payment link get             | `PaymentLinkDetailResponse` | ❌ `metadata`, `item_id` null           |
| 16  | invoice create               | `InvoiceResponse`           | ✅                                      |
| 17  | invoice get                  | `InvoiceResponse`           | ✅                                      |
| 18  | invoice void                 | `{ success }`               | ✅                                      |
| 19  | invoice missing              | `DefaultError`              | ✅                                      |
| 20  | payment link missing         | `DefaultError`              | ✅                                      |
| 21  | status (signature)           | `WebhookPayload`            | ✅                                      |
| 22  | status (signature)           | `ResponseTransaction`       | ✅                                      |
| 23  | unauthorized (401)           | `ApiErrorSchema`            | ❌ unmodeled `{ error }`                |

**12 pass / 11 fail.**

## Appendix B — file disposition

| Path                                                                    | Disposition                                                                                       |
| :---------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------ |
| `src/client/client.ts`                                                  | Rewrite internals; keep exported surface byte-for-byte in behavior                                |
| `src/client/error.ts`                                                   | Rewrite as `normalizeError` + alias `errorHandler`                                                |
| `src/client/merchant.ts`                                                | Keep; export from `./client`; extract signature/order-id helpers into `helper/`                   |
| `src/api/shared.ts`                                                     | Replace with `api/service.ts` (`BaseService`), internal symbols in `client/context.ts`            |
| `src/api/{core-payment,core-subscription,invoice,payment-link,snap}.ts` | Keep classes/methods; retype; use `BaseService.request()`                                         |
| `src/schema/common/**`                                                  | Merge into `primitives/` or delete (superseded)                                                   |
| `src/schema/shared/**`                                                  | Merge into `primitives/`/`core/`                                                                  |
| `src/schema/core/responses/**`                                          | Rewrite (base + discriminated channel union + lifecycle)                                          |
| `src/schema/snap/request.ts`, `snap/response.ts`                        | Rewrite (array `item_details`, full channel list, real preference shape)                          |
| `src/schema/snap/requests/**`, `snap/responses/**`                      | Delete                                                                                            |
| `src/schema/payment-link/responses/create.ts`                           | Rewrite (`payment_url`, `qr_url`)                                                                 |
| `src/schema/payment-link/responses/get.ts`                              | Rewrite from fixture (nullable `metadata`, `item_id`, `expiry.units`)                             |
| `src/schema/invoice/**`                                                 | Keep structure; fix `virtual_accounts`, date/phone rules, rewrite response without `deepNullable` |
| `src/schema/subscription/**`                                            | New request/response schemas                                                                      |
| `src/schema/notification/**`                                            | Keep; align with `primitives`                                                                     |
| `src/schema/error/**`                                                   | Extend union (unauthorized, subscription 400, empty body); keep `HttpStatus` deprecated           |
| `src/schema/helper.ts`                                                  | Delete after rewrites (only `NarrowInput`/`MergeWithSchema`/`DeepNullable` remain today)          |
| `src/typings/utility.ts`                                                | Delete; use `@itsrose/types` (or `Partial` locally)                                               |
| `src/constants.ts`                                                      | Keep URLs/limits; drop duplicated env keys                                                        |
| `README.md`                                                             | Rewrite                                                                                           |
| `__tests__/*`                                                           | Expand per section 8                                                                              |
