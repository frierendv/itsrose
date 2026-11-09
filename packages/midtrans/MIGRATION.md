# Migrating to `@itsrose/midtrans` v2

v2 keeps the public `MidtransClient` surface (same members, methods and
`{ ok, data, error }` envelope) but aligns schemas and types with the real
Midtrans API. This guide lists the breaking changes.

## Client surface (unchanged)

```ts
const client = new MidtransClient(options);
client.environment; // "production" | "sandbox"
client.merchant; // MidtransMerchant
client.core.payment; // Payment
client.core.subscription; // Subscription
client.snap; // Snap
client.paymentLink; // PaymentLink
client.invoice; // Invoice
```

All methods keep their names and arity. `MidtransMerchant` is now exported from
`@itsrose/midtrans/client` (and the root entry).

## Error handling

- `error` is always a normalized `MidtransApiError` with a `kind` discriminator:
  `core`, `legacy`, `unauthorized` or `transport`.
- Errors are never `undefined` when a request fails. The v1 short-circuit that
  ignored payloads containing `order_id` is gone.
- `expire()` and a status lookup after expiry now resolve with `ok: true`
  (business code `407`).
- `approve()` / `deny()` on a non-applicable transaction resolve with a
  structured `transport` error instead of a swallowed `TypeError`.
- Services expose `MidtransApiError`; per-service `CoreError`/`DefaultError`
  generics were removed (the schemas are still exported).
- `errorHandler` remains as the HTTP-client adapter; use
  `normalizeMidtransError` when normalizing a payload yourself.

```ts
const result = await client.core.payment.refund("ORDER-1", {
	reason: "refund",
});

if (result.error) {
	switch (result.error.kind) {
		case "legacy":
			console.error(result.error.error_messages);
			break;
		case "core":
			console.error(result.error.validation_messages);
			break;
		default:
			console.error(result.error.status_message);
	}
}
```

## Schema names

The `schema/common` family was merged into `schema/shared`. Schema values now
end with `Schema`; their inferred types keep the short name.

| v1 value                                       | v2 value                            |
| :--------------------------------------------- | :---------------------------------- |
| `Address`                                      | `AddressSchema`                     |
| `Callbacks`                                    | `CallbacksSchema`                   |
| `CustomExpiry`                                 | `CustomExpirySchema`                |
| `SnapExpiry` / `ExpirySchema`                  | `SnapExpirySchema` / `ExpirySchema` |
| `CustomerDetails` (loose)                      | `CustomerDetailsSchema` (strict)    |
| `ItemDetails`                                  | `ItemDetailsSchema`                 |
| `Metadata`                                     | `MetadataSchema`                    |
| `CustomFields`                                 | `CustomFieldsSchema`                |
| `TimestampFields`                              | `TimestampFieldsSchema`             |
| `TransactionDetails`                           | `TransactionDetailsSchema`          |
| `BaseTransactionResult`                        | `BaseTransactionResultSchema`       |
| `VaNumber` / `PaymentAction` / `PaymentAmount` | `…Schema`                           |
| `PaymentChannelBankSchema` (internal)          | `BankCodeSchema`                    |
| `PaymentChannelBankVaSchema`                   | `VaBankSchema`                      |
| `PaymentChannelOverTheCounterSchema`           | `CstoreStoreSchema`                 |
| `ResponseTransactionSchema`                    | `CoreTransactionResponseSchema`     |
| `PaymentLinkDetailResponse` (schema)           | `PaymentLinkDetailResponseSchema`   |
| `WebhookPayload` (schema)                      | `WebhookPayloadSchema`              |

Kept as deprecated aliases: `ResponseTransactionSchema`,
`ResponseTransactionBaseSchema`, `ResponseTransactionTypeFieldsSchema`,
`WebhookPayload`, `PaymentLinkExpiry`, `PaymentLinkDetail`,
`ItemDetailsBCAKlikPayExclusive` and `HttpStatus`.

Removed from `@itsrose/midtrans/typings`: `Prettify`, `NarrowSchemaInput` and
`DeepRequired`. `DeepPartial` is still exported.

## Requests

- `invoice.create(body)` accepts a plain `InvoiceRequest`; the v1
  `NarrowInput` / `MergeWithSchema` helpers were removed.
- Invoice virtual accounts use the plural `virtual_accounts` field.
- `snap.create` accepts an **array** of `item_details`, every payment channel in
  `enabled_payments` (`credit_card`, `akulaku`, `kredivo`, `other_qris`, …),
  `callbacks.unfinish`, and channel overrides (`bca_va`, `gopay`, `cstore`, …).
- `Payment.capture` now takes `{ transaction_id }` instead of
  `Record<string, unknown>`.
- `Payment.status` no longer accepts a response generic; it returns
  `CoreTransactionResponse`.
- `Payment.refund` and `Payment.statusB2B` have overloads for body vs
  request-options.
- `Payment.directRefund` takes `CorePaymentRefundRequest` (the
  `& Record<string, unknown>` intersection was removed).
- `core.subscription.create` requires the full
  `SubscriptionCreateRequest`; `update` accepts a partial
  `SubscriptionUpdateRequest`; `disable`/`enable`/`cancel` return
  `SubscriptionActionResponse`.
- `snap.updatePreferences` takes the `SnapPreference` request schema.
- `RequestOptions.signal` was added for request cancellation.

## Responses

- Core charge responses are a discriminated union on `payment_type`; use
  `data.payment_type` to access channel-specific fields.
- `signature_key` is optional (only present on status/webhook responses) and
  `va_numbers` is optional (Permata and expired transactions omit it).
- `fraud_status` now includes `challenge`.
- `statusB2B` returns a typed `{ status_code, status_message, transactions }`
  object.
- Payment Link create returns `{ order_id, payment_url, qr_url }`; the detail
  response is an explicit schema (`customer_details`/`metadata` nullish,
  `item_id` nullable, plural expiry units).
- Snap preferences: `allow_retry` can be `null`, channels use
  `{ name, enabled }`, and `customer_imposed_payment_fee.payment_fee_configs` is
  an array.
- Subscription responses have schemas; `schedule.start_time` is a string.
- `invoice.void` returns `InvoiceVoidResponse`.

## Configuration

- `client.environment` is typed as `"production" | "sandbox"` (the
  `development` option is still accepted and maps to sandbox).
- Passing contradictory `isProduction` and `environment` values now throws.
- Custom `baseUrl` / `snapBaseUrl` values must be absolute URLs.
- The environment key constants (`MIDTRANS_SERVER_KEY`, …) were removed from
  `@itsrose/midtrans/constants`; use `MIDTRANS_ENV` from
  `@itsrose/midtrans/env`.

## Internal exports

- `SHARED_CLIENT` and `SHARED_HTTP_CLIENT` are no longer exported.
- `BaseService` replaces the previous `SharedClient` base class; `SharedClient`
  remains as a deprecated alias.
- Services are constructed with a `ClientContext` instead of a
  `MidtransClient` (only relevant if you instantiate services directly).

## Migration examples

```ts
// v1
const { data } = await client.invoice.create(payload as never);

// v2
const { data } = await client.invoice.create(payload);
```

```ts
// v1
// v2
import {
	Callbacks,
	CallbacksSchema,
	ItemDetails,
	ItemDetailsSchema,
	Metadata,
	MetadataSchema,
} from "@itsrose/midtrans/schema";
```

```ts
// v1: item_details had to be a single object
await client.snap.create({ item_details: item, enabled_payments: ["bca_va"] });

// v2: an array and any supported channel
await client.snap.create({
	item_details: [item],
	enabled_payments: ["bca_va", "credit_card", "akulaku", "other_qris"],
});
```
