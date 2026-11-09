# @itsrose/midtrans

Midtrans Payment Gateway SDK.

Designed specifically for Indonesian payment methods that do not require corporate legal entity verification (NPWP Badan Usaha / PT / CV).

---

## Usage

Please see the source code.

---

## Development

### Sandbox environment

```bash
cp packages/midtrans/.env.example packages/midtrans/.env.dev
# fill in the sandbox keys, then run commands from the monorepo root
```

`.env.dev` is gitignored. The fixture tooling refuses to run unless
`MIDTRANS_ENVIRONMENT=sandbox` and the server key starts with `SB-Mid-server-`.

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

### Baseline (Phase 0)

| Check            | Result                                                                          |
| :--------------- | :------------------------------------------------------------------------------ |
| Sandbox fixtures | 30 captured                                                                     |
| Fixture contract | 29 must-pass · 1 transport-only (empty body) · 0 unmodeled                      |
| Architecture     | `client → api → context`; one `schema/shared`; charges narrow by `payment_type` |
| Package coverage | 94.11% statements · 89.04% branches · 86.11% functions                          |
| Refactor plan    | [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md)                                          |
