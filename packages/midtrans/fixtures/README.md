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
`unmodeled`. There are 36 fixtures: 35 are `mustPass` and the only remaining
tracked case is `core/approve-empty-response` — approve/deny answer HTTP 404 with
an empty body, which is covered by the transport tests instead of a JSON schema.
A `knownMismatch` that starts passing is reported as `promoted` so the manifest
can be updated.

## Paid-path testing

`tools/sandbox-simulator.ts` drives the Midtrans payment simulator to settle
virtual-account and Alfamart transactions. `core/status-settled` is captured that
way. Refunds, captures and FDS actions still need a paid/card transaction; on
this sandbox merchant `refund` currently answers `412 Merchant cannot modify the
status of the transaction`, so successful refund fixtures remain open.

## Not covered yet

These require a settled card transaction or an inbound webhook, so they cannot be
captured automatically yet:

- successful `refund` / `directRefund`;
- `capture`;
- FDS `approve` / `deny` after a challenge;
- transaction and invoice webhooks.
