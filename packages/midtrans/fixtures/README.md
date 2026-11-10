# Sandbox fixtures

Committed, sanitized responses captured from the Midtrans **sandbox**. They are
the regression net for `src/schema/**`: every fixture is validated offline by
`fixtures:verify` and by `__tests__/contract/fixtures.test.ts`.

## Format

Each file wraps the response:

```json
{
	"_meta": {
		"name": "core/charge-bank-transfer-bca",
		"endpoint": "POST /v2/charge",
		"http_status": 200,
		"captured_at": "2026-11-09T16:00:00.000Z",
		"source": "midtrans-sandbox",
		"sanitized": true
	},
	"body": {}
}
```

`_meta.endpoint` is a stable template (`{order_id}`, `{invoice_id}`, …); the real
identifiers are never stored.

## Refreshing

```bash
cp packages/midtrans/.env.example packages/midtrans/.env.dev
# fill in the sandbox keys, then:
pnpm --filter @itsrose/midtrans fixtures:capture
pnpm --filter @itsrose/midtrans fixtures:verify
```

`fixtures:capture` refuses to run unless `MIDTRANS_ENVIRONMENT=sandbox` and the
server key starts with `SB-Mid-server-`. Review the diff, update expectations in
`tools/fixture-manifest.ts` if a contract changed, and commit the fixtures.

## Sanitization

`tools/sanitize.ts` replaces values that must never be committed:

- `signature_key` (SHA-512 digest derived from the server key);
- Snap tokens, redirect URLs, virtual-account numbers, payment codes, bill keys
  and QR strings;
- invoice/payment-link PDF URLs (signed object-storage URLs that embed temporary
  STS credentials);
- merchant/order/transaction identifiers and customer details.

The sanitizer is deterministic and keeps JSON types intact, so schemas remain
representative of the real payload. `fixtures:verify` and the contract test also
fail if a fixture contains a server key, a signed URL, or a non-redacted
`signature_key`.

## Known mismatches

`tools/fixture-manifest.ts` marks each fixture as `mustPass`, `knownMismatch` or
`unmodeled`. There are 39 fixtures: 38 are `mustPass` and the only remaining
tracked case is `core/approve-empty-response` — approve/deny answer HTTP 404 with
an empty body, which is covered by the transport tests instead of a JSON schema.
A `knownMismatch` that starts passing is reported as `promoted` so the manifest
can be updated.

## Paid-path testing

### Virtual accounts and convenience stores

`tools/sandbox-simulator.ts` drives the payment simulator to settle pending
transactions. `core/status-settled` is captured that way.

```bash
pnpm --filter @itsrose/midtrans sandbox:pay <order-id>
```

### Credit cards

`tools/card-sandbox.ts` tokenizes test cards through `GET /v2/token` (client key
only) so the capture tool can charge them.

| Card                  | Observed outcome           |
| :-------------------- | :------------------------- |
| `4811 1111 1111 1114` | `200` `capture` + `accept` |
| `5211 1111 1111 1117` | `200` `capture` + `accept` |
| `4111 1111 1111 1111` | `202` `deny`               |
| `4911 1111 1111 1113` | `202` `deny`               |

Captured fixtures: `core/charge-credit-card`, `core/charge-credit-card-denied`,
and `core/charge-credit-card-3ds` (a secure charge returns `pending` plus a
`redirect_url` challenge).

> The table contradicts the published "denied" test cards: on this sandbox
> merchant `4411 1111 1111 1118` is **accepted**. Treat the table as observed
> behaviour.

### Webhooks

Real notifications are captured through a Cloudflare tunnel. Three steps:

```bash
# 1. record (writes one JSON file per notification)
pnpm --filter @itsrose/midtrans sandbox:webhook --port 8787 --prefix /midtrans \
  --out .webhook-inbox

# 2. expose it
cloudflared --config .cloudflared/config.yml tunnel run
# or, without a named tunnel:
cloudflared tunnel --url http://localhost:8787

# 3. charge with the override header
#    X-Override-Notification: https://<host>/midtrans
#    (or X-Append-Notification to keep the dashboard URL too)
```

Then promote the recording into a fixture and register it:

```bash
pnpm --filter @itsrose/midtrans sandbox:webhook:promote \
  --from .webhook-inbox/000-<order>.json \
  --name notification/transaction-card
```

`notification/transaction-card` was captured this way from a real card charge
(`capture`/`accept`). The payload confirmed two fields that were missing from the
schemas and are now modelled:

- the credit-card fields (`masked_card`, `bank`, `card_type`, `approval_code`,
  `channel_response_code`, `channel_response_message`), which `WebhookPayloadSchema`
  previously stripped;
- `customer_details`, which Midtrans always sends (an empty object when there is
  no customer data).

Notifications are also still validated indirectly by replaying status responses
(`core/status-settled`, `core/charge-credit-card`).

> The `.webhook-inbox/` directory is scratch space; sanitize-and-promote rather
> than committing raw recordings.

## Blocked on merchant configuration

These paths cannot produce a success fixture while the sandbox merchant keeps its
current configuration. Each was retried after settlement and still failed, so the
cause is a merchant setting rather than transaction state:

| Path                        | Response                                    |
| :-------------------------- | :------------------------------------------ |
| `refund` (any method)       | `412 Transaction status cannot be updated.` |
| `refund/online/direct`      | `412 Transaction status cannot be updated.` |
| pre-authorization `capture` | `402 No MID/TID for this transaction`       |
| FDS `challenge`             | charges return `accept` or `deny` directly  |

Re-run `fixtures:capture` after enabling refunds, pre-authorization or FDS in the
sandbox dashboard; the capture tool already contains the card scenarios.
