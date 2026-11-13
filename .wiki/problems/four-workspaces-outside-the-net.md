# Four workspaces outside the net

**Observed 2026-11-14**, by a pit-of-success audit.

The gate covers most of the repo. It does not cover all of it, and the gaps
are not obvious from the root `package.json` scripts — turbo makes it look
complete.

## The gap

`jest.config.ts` defines projects for `packages/core`, `packages/features`,
`packages/internal`, `packages/shared`, `packages/midtrans`, `packages/auth`,
`packages/react`, `apps/api` and `apps/dashboard`.

**Missing:** `packages/standard`, `packages/types`, `apps/api-internal`,
`apps/waf-page`, `apps/web`.

Three consequences:

1. **A test can be written, committed, and never execute.** The root
   `test` script is `jest --verbose --runInBand --passWithNoTests`. A test
   dropped in `packages/types/src/__tests__/` is never discovered, and
   `--passWithNoTests` means the suite still exits green.
2. **`apps/waf-page` has no static checking at all.** Its `package.json`
   scripts are `astro | build | dev | preview` — no `lint`, no `typecheck` —
   and it has no `eslint.config.ts`. Its 13 `.astro` source files are never
   linted, never typechecked, never tested.
3. **`packages/standard` has no scripts at all.** The package that defines the
   lint, format and typecheck preset every other package consumes is itself
   unlinted, untypechecked and untested. A typo in a rule name in
   `packages/standard/eslint/base.js` would silently disable that rule
   everywhere — which is exactly how `no-explicit-any` came to be off. See
   [mandatory rules that nothing enforces](mandatory-rules-that-nothing-enforces.md).

## The related trap: where a test file must live

`jest.config.ts` sets `testMatch: ["…/**/__tests__/**/*.test.[jt]s?(x)"]` for
the `packages/**`, `apps/api` and `apps/dashboard` projects. A test written as
`src/foo.test.ts` is **not matched** — and with `--passWithNoTests` the suite
stays green.

`packages/react` and the midtrans project use jest's defaults, so behaviour
differs _between_ packages for no stated reason.

## The fix

- Add the five missing jest projects.
- Give `apps/waf-page` `lint` and `typecheck` scripts and an eslint config.
- Give `packages/standard` `lint` and `typecheck` scripts.
- Broaden `testMatch` to `["**/__tests__/**/*.[jt]s?(x)", "**/*.{test,spec}.[jt]s?(x)"]`
  and document the convention in AGENTS.md.
- Make the local and CI test invocations identical, so a class of flake cannot
  manifest in only one environment.

## Related

- [The gate cannot see most of the codebase](the-gate-cannot-see-most-of-the-codebase.md)
- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
