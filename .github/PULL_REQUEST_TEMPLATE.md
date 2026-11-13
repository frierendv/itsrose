## What this changes

<!-- One paragraph. What is different after this PR that was not different before? -->

## Why

<!-- The reasoning, not the diff. What was wrong, or missing, or hard? -->

## Behaviour

<!--
  The most important section. If this PR adds or changes an EXPORTED
  behaviour, name the public interface and the test that exercises it.

  A test that asserts a config has the right shape is not a test of the
  behaviour. Drive the public interface and assert the observable outcome.

  Example:
  - Interface: `packages/internal/http-client` — `HttpClient.get`
  - Test: `packages/internal/http-client/__tests__/retry.test.ts`
  - Observable: a 500 is retried 3 times; the third attempt succeeds
-->

- **Public interface changed:**
- **Test that proves it:**
- **Observable outcome asserted:**

<!-- If this PR changes no behaviour (refactor, docs, tooling), say so. -->

## Checklist

<!-- Tick only what applies. These are the repo's mandatory rules. -->

- [ ] The full gate passes locally: `pnpm format:check && pnpm lint && pnpm build && pnpm typecheck && pnpm test --coverage`
- [ ] `pnpm sync:package` was run if any `package.json` `exports` changed (never hand-edit `exports` — tsdown owns it)
- [ ] No new `any` — `unknown` plus narrowing, or a Zod parse
- [ ] No manual TypeScript interface beside a Zod schema — types are inferred from the schema
- [ ] API request and response payloads use `snake_case`
- [ ] `domain/*` imports no vendor SDK, database driver, or network client
- [ ] Route handlers are thin controllers, and do no business logic
- [ ] Frontend code imports nothing from `*/server`, `*/plugin-server`, or `@itsrose/s3`
- [ ] New domain vocabulary is written down in `GLOSSARY.md`
- [ ] A decision worth remembering is recorded in `.wiki/`
