# @itsrose/midtrans

Typed Midtrans payment-gateway client for Node.js, built on Zod v4 schemas and
the ItsRose HTTP client.

- Snap checkout, Core API payments, Payment Links, Invoicing and Subscriptions.
- Request/response schemas derived from real sandbox captures.
- Normalized API errors, idempotency headers and abort signals.
- SHA-512 notification signature verification.
- The public `MidtransClient` surface is frozen by a snapshot test.

Requires Node.js `>=24`.

## Install

```bash
pnpm add @itsrose/midtrans
```

## Quick start

```ts
import { MidtransClient } from "@itsrose/midtrans";

const client = new MidtransClient({
	serverKey: process.env.MIDTRANS_SERVER_KEY!,
	clientKey: process.env.MIDTRANS_CLIENT_KEY,
	environment: "sandbox",
});
```

The server key is required. It can also come from `MIDTRANS_SERVER_KEY`
(see [Configuration](#configuration)).

## Configuration

### Environment variables

| Variable               | Required | Description                                             |
| :--------------------- | :------- | :------------------------------------------------------ |
| `MIDTRANS_SERVER_KEY`  | yes      | Merchant server key used for BASIC auth and signatures. |
| `MIDTRANS_CLIENT_KEY`  | no       | Client key used by Snap.js integrations.                |
| `MIDTRANS_MERCHANT_ID` | no       | Merchant id exposed on `client.merchant`.               |
| `MIDTRANS_ENVIRONMENT` | no       | `sandbox` (default) or `production`.                    |

Copy [`.env.example`](.env.example) to `.env.dev` for local sandbox work. The
file is gitignored.

### Client options

| Option         | Type                                         | Description                                        |
| :------------- | :------------------------------------------- | :------------------------------------------------- |
| `serverKey`    | `string`                                     | Overrides `MIDTRANS_SERVER_KEY`.                   |
| `clientKey`    | `string`                                     | Overrides `MIDTRANS_CLIENT_KEY`.                   |
| `merchantId`   | `string`                                     | Overrides `MIDTRANS_MERCHANT_ID`.                  |
| `environment`  | `"production" \| "sandbox" \| "development"` | `development` is an alias for `sandbox`.           |
| `isProduction` | `boolean`                                    | Shorthand for `environment: "production"`.         |
| `baseUrl`      | `string`                                     | Overrides the Core/Payment Link base URL.          |
| `snapBaseUrl`  | `string`                                     | Overrides the Snap base URL.                       |
| `headers`      | `Record<string, string \| undefined>`        | Default headers merged into every request.         |
| `timeout`      | `number`                                     | Request timeout in milliseconds (default `30000`). |

Environment precedence: `isProduction` → `environment` →
`MIDTRANS_ENVIRONMENT` → `sandbox`. Contradictory explicit options throw, and
custom base URLs must be absolute URLs.

### Per-request options

Every API method accepts an optional second argument:

```ts
await client.core.payment.charge(body, {
	idempotencyKey: "charge-order-1",
	appendNotification: "https://example.com/webhook",
	overrideNotification: "https://example.com/webhook",
	headers: { "X-Custom": "value" },
	timeout: 10_000,
	signal: abortController.signal,
});
```

## Services

### Core payments

```ts
const result = await client.core.payment.charge({
	payment_type: "bank_transfer",
	transaction_details: { order_id: "ORDER-1", gross_amount: 15000 },
	bank_transfer: { bank: "bca" },
});

if (result.error) {
	throw new Error(result.error.status_message);
}

const charge = result.data;
if (charge.payment_type === "bank_transfer") {
	console.log(charge.va_numbers?.[0]?.va_number, charge.expiry_time);
}
```

`charge` returns a discriminated union: `payment_type` narrows the channel
fields (`va_numbers`, `bill_key`, `payment_code`, `qr_string`, `actions`, …).

| Method         | Endpoint                                  | Response                  |
| :------------- | :---------------------------------------- | :------------------------ |
| `charge`       | `POST /v2/charge`                         | `CoreChargeResponse`      |
| `capture`      | `POST /v2/capture`                        | `CoreTransactionResponse` |
| `approve`      | `POST /v2/{orderId}/approve`              | `CoreTransactionResponse` |
| `deny`         | `POST /v2/{orderId}/deny`                 | `CoreTransactionResponse` |
| `cancel`       | `POST /v2/{orderId}/cancel`               | `CoreTransactionResponse` |
| `expire`       | `POST /v2/{orderId}/expire`               | `CoreTransactionResponse` |
| `refund`       | `POST /v2/{orderId}/refund`               | `CoreTransactionResponse` |
| `directRefund` | `POST /v2/{orderId}/refund/online/direct` | `CoreTransactionResponse` |
| `status`       | `GET /v2/{orderId}/status`                | `CoreTransactionResponse` |
| `statusB2B`    | `GET /v2/{orderId}/status/b2b`            | `CoreStatusB2BResponse`   |

### Subscriptions

```ts
const { data: subscription } = await client.core.subscription.create({
	name: "Pro monthly",
	amount: "15000",
	currency: "IDR",
	payment_type: "credit_card",
	token: "saved-token",
	schedule: { interval: 1, interval_unit: "month" },
});

await client.core.subscription.disable(subscription.id);
await client.core.subscription.enable(subscription.id);
await client.core.subscription.update(subscription.id, { name: "Pro" });
await client.core.subscription.cancel(subscription.id);
```

### Snap

```ts
const { data } = await client.snap.create({
	transaction_details: { order_id: "SNAP-1", gross_amount: 15000 },
	item_details: [
		{ id: "sku-1", price: 15000, quantity: 1, name: "Pro plan" },
	],
	enabled_payments: ["bca_va", "gopay", "credit_card"],
	callbacks: { finish: "https://example.com/finish" },
});

console.log(data.token, data.redirect_url);
```

`getPreferences`, `updatePreferences`, `create` and `status` are available.
`snap.status(orderId)` is shorthand for `core.payment.status`.

### Payment links

```ts
const { data } = await client.paymentLink.create({
	transaction_details: { order_id: "PL-1", gross_amount: 15000 },
	enabled_payments: ["bca_va", "gopay"],
});

console.log(data.payment_url, data.qr_url);
```

`paymentLink.get(orderId)` returns the full link detail, and
`paymentLink.delete(orderId)` deletes it.

### Invoices

```ts
const { data: invoice } = await client.invoice.create({
	order_id: "INV-1",
	invoice_number: "INV-1",
	invoice_date: "2026-11-09T22:00:00+07:00",
	due_date: "2026-12-31T23:59:00+07:00",
	customer_details: {
		name: "Probe User",
		email: "probe@example.org",
		phone: "8123456789",
	},
	item_details: [{ item_id: "sku-1", quantity: 1, price: 15000 }],
	payment_type: "payment_link",
	payment_link: { enabled_payments: ["bca_va"] },
	document_type: "invoice",
	tax_mode: "exclusive",
});

await client.invoice.get(invoice.id);
await client.invoice.void(invoice.id);
```

Invoice dates use ISO-8601 with an offset. The sandbox invoice API expects a
phone number without a leading `0`.

### Merchant helpers

```ts
const orderId = client.merchant.generateOrderId(userId); // ORD-202611-8F2B-9K42

const authHeader = client.merchant.createAuthKey(); // "Basic ..."

const valid = client.merchant.verifySignature({
	order_id: "ORDER-1",
	status_code: "200",
	gross_amount: "15000.00",
	signature_key: "…",
});
```

`client.merchant.clientKey` is non-enumerable so serializing the merchant does
not leak it; the server key never exists on the public object.

## Response envelope

Every method resolves to the ItsRose HTTP envelope:

```ts
const { ok, data, error, status, statusText, headers, config } =
	await client.core.payment.status("ORDER-1");
```

| Field        | Description                                                     |
| :----------- | :-------------------------------------------------------------- |
| `ok`         | Transport/business success (Midtrans business codes respected). |
| `data`       | Typed response payload.                                         |
| `error`      | Normalized `MidtransApiError` when `ok` is false.               |
| `status`     | HTTP status code.                                               |
| `statusText` | HTTP status text.                                               |
| `headers`    | Raw Axios response headers.                                     |
| `config`     | Request configuration used for the call.                        |

## Errors

`HttpResponse.error` is always a normalized `MidtransApiError`:

| `kind`         | Source                                         | Notable fields                       |
| :------------- | :--------------------------------------------- | :----------------------------------- |
| `core`         | Core API / subscription error                  | `status_code`, `validation_messages` |
| `legacy`       | Snap, Invoice, Payment Link (`error_messages`) | `error_messages`                     |
| `unauthorized` | HTTP 401 (`{ error: "Unauthorized" }`)         | `status_message`                     |
| `transport`    | Empty body, plain text, network-level failure  | `status_code`, `details`             |

```ts
if (result.error) {
	switch (result.error.kind) {
		case "legacy":
			console.error(result.error.error_messages?.join("; "));
			break;
		case "core":
			console.error(
				result.error.status_message,
				result.error.validation_messages
			);
			break;
		default:
			console.error(result.error.status_message);
	}
}
```

`expire()` and status lookups after expiry resolve with `ok: true` (Midtrans
business code `407`), while `approve`/`deny` on a non-applicable transaction
resolve with a structured `transport` error instead of throwing.

## Webhooks

```ts
import {
	InvoiceWebhookSchema,
	WebhookPayloadSchema,
} from "@itsrose/midtrans/schema";

const payload = WebhookPayloadSchema.parse(request.body);

if (!client.merchant.verifySignature(payload)) {
	throw new Error("Invalid Midtrans signature");
}
```

The signature is `SHA512(order_id + status_code + gross_amount + serverKey)`.
`InvoiceWebhookSchema` is available for invoice notifications.

## Typed schemas

Every request and response used by the client is exported from
`@itsrose/midtrans/schema` as a Zod schema plus its inferred type:

```ts
import {
	CoreChargeResponseSchema,
	InvoiceRequestSchema,
	type CoreChargeResponse,
} from "@itsrose/midtrans/schema";

const parsed = CoreChargeResponseSchema.safeParse(webhookBody);
```

The client does not re-parse responses at runtime; schemas are the contract and
are validated against a committed sandbox fixture corpus. They can be used
directly for webhook or queue payload validation.

## Development

```bash
cp packages/midtrans/.env.example packages/midtrans/.env.dev
# fill in the sandbox keys

pnpm --filter @itsrose/midtrans typecheck
pnpm --filter @itsrose/midtrans lint
pnpm test packages/midtrans
```

### Sandbox simulator

The package ships helpers for the Midtrans payment simulator
([docs](https://docs.midtrans.com/docs/testing-payment-on-sandbox)), used to
settle pending transactions while testing:

```bash
pnpm --filter @itsrose/midtrans sandbox:pay <order-id>
```

It supports BCA/BNI and OpenAPI virtual accounts (BRI, Permata, CIMB, …) plus
Alfamart (and Indomaret when the merchant product code is configured). The
implementation lives in [`tools/sandbox-simulator.ts`](tools/sandbox-simulator.ts).

### Card testing

[`tools/card-sandbox.ts`](tools/card-sandbox.ts) tokenizes test cards through
`GET /v2/token` so card charges, declines and 3DS challenges can be exercised:

```ts
import { createTestCardToken } from "./tools/card-sandbox";

const tokenId = await createTestCardToken(
	"visa",
	process.env.MIDTRANS_CLIENT_KEY!
);

await client.core.payment.charge({
	payment_type: "credit_card",
	transaction_details: { order_id: "ORDER-1", gross_amount: 15000 },
	credit_card: { token_id: tokenId },
});
```

Secure charges return `pending` plus a `redirect_url` challenge:

```ts
const charge = await client.core.payment.charge({
	payment_type: "credit_card",
	transaction_details: { order_id: "ORDER-2", gross_amount: 15000 },
	credit_card: { token_id: tokenId, secure: true, authentication: true },
});

if (charge.data.transaction_status === "pending") {
	// send the customer to charge.data.redirect_url
}
```

### Webhook capture

[`tools/webhook-receiver.ts`](tools/webhook-receiver.ts) records real
notifications so a genuine payload can be inspected before it becomes a fixture:

```bash
pnpm --filter @itsrose/midtrans sandbox:webhook --port 8787 --out /tmp/inbox
ngrok http 8787
# charge with X-Override-Notification: https://<tunnel>/midtrans
```

### Sandbox CI

[`.github/workflows/midtrans-sandbox.yml`](../../.github/workflows/midtrans-sandbox.yml)
runs weekly and on demand. It replays `fixtures:capture` against the sandbox,
fails when the responses drift from the committed fixtures, and runs the
integration suite. Configure `MIDTRANS_SANDBOX_SERVER_KEY`,
`MIDTRANS_SANDBOX_CLIENT_KEY` and `MIDTRANS_SANDBOX_MERCHANT_ID` as repository
secrets.

Opt-in integration tests settle real sandbox transactions (virtual account,
Alfamart and card flows):

```bash
MIDTRANS_INTEGRATION=1 pnpm test packages/midtrans/__tests__/integration
```

They are skipped unless `MIDTRANS_INTEGRATION=1` and sandbox credentials are
available.

### Sandbox fixtures

Committed, sanitized sandbox responses are the schema regression net:

```bash
pnpm --filter @itsrose/midtrans fixtures:capture   # refresh from the sandbox
pnpm --filter @itsrose/midtrans fixtures:verify    # offline schema validation
```

Fixtures live in [`fixtures/`](fixtures/README.md) and are registered in
[`tools/fixture-manifest.ts`](tools/fixture-manifest.ts). Captures are sanitized
before they are written: tokens, virtual-account numbers, signatures and signed
storage URLs never reach the repository.

## Architecture

```text
src/client  →  src/api  →  src/schema
     │            │            │
 transport    services     Zod schemas + primitives
```

- `client` resolves options and builds the shared `ClientContext`.
- `api` services receive the context (no `client → api` cycle).
- `schema` is a single `primitives` family (no duplicate `common` schemas).
- The public `MidtransClient` shape is enforced by
  [`__tests__/client-surface.test.ts`](__tests__/client-surface.test.ts).

## Quality

| Check              | Result                                                  |
| :----------------- | :------------------------------------------------------ |
| Sandbox fixtures   | 39 captured (38 must-pass, 1 transport-only empty body) |
| Tests              | 11 suites / 79 tests (5 opt-in integration skipped)     |
| Coverage           | 94.27% statements · 89.68% branches · 86.07% functions  |
| ESM runtime bundle | 80.3 kB (18.0 kB gzip)                                  |
| Type declarations  | 264 kB                                                  |
| Client surface     | frozen by tests                                         |

See [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md) for the refactor record and
[`MIGRATION.md`](MIGRATION.md) for the v1 → v2 upgrade guide.

## License

MIT
