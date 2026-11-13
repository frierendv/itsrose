# The environment backlog

**Created 2026-11-14** from a pit-of-success audit of the environment. Every
item is a mechanism that lets the codebase drift without anything noticing.

Status values: **Done** · **In flight** · **Todo** · **Decide**.

## The ranking that matters

The audit's own conclusion was that the first two items are the highest
leverage, because everything else becomes enforceable only once untested code
is visible.

## The gate's own blindness

| #   | Item                                                                                          | Status    | Note                                                                                               |
| --- | --------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| 1   | `collectCoverageFrom` — the coverage number measured only files a test had loaded             | Todo      | Will make the gate red on landing; land with #2 in one commit                                      |
| 2   | Per-package coverage thresholds                                                               | Todo      | `./packages/auth/usage/`, `./packages/auth/billing/`, `./packages/features/`                       |
| 3   | CI runs on pushes to `development`                                                            | In flight | `ci.yml` triggers `push: [main]` only — this is how `8216c89` reached the shared branch unobserved |
| 4   | Local and CI test invocations agree                                                           | In flight | Local serial, CI parallel: a class of flake manifests in one environment only                      |
| 5   | Five missing jest projects; `apps/waf-page` and `packages/standard` have no lint or typecheck | Todo      | `packages/standard` defines the preset every other package consumes                                |
| 6   | `testMatch` breadth — a test outside `__tests__/` is silently never run                       | Todo      | `--passWithNoTests` hides the loss                                                                 |

## Rules that are written but not enforced

| #   | Item                                                                                                          | Status | Note                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | `no-explicit-any` → error                                                                                     | Todo   | 22 live `any`; the consequential ones erase a boundary (`fetcher<any>` in tiktok, `process.env as any`)                                                                                        |
| 8   | `no-empty-object-type` → error                                                                                | Todo   | 17 `interface X extends z.infer<...> {}`; the rule was switched off to accommodate them                                                                                                        |
| 9   | snake_case payload check, scoped to `apps/api`, `apps/api-internal`, `packages/features/*`, `packages/auth/*` | Todo   | Live violations in `schema/subscription.ts`, `schema/api-plan.ts`, `storage/src/plugin-server.ts`                                                                                              |
| 10  | Hexagonal import restriction for `src/application/**`                                                         | Todo   | `src/domain` and `src/client` are restricted in billing; `src/application` is not, and `packages/auth/usage` has no restriction at all. No live violations — this is a missing rule, not a bug |

## Behaviour that is advertised and never exercised

| #   | Item                                                         | Status | Note                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11  | Feature packages' exported behaviour has no behavioural test | Todo   | Each `packages/features/*` has one test file asserting schemas and helper _shapes_. The `getVoices` redaction regex, all seven mtxx operations and the whole instagram scraping stack are unverified |
| 12  | Response schemas exported but never applied at runtime       | Todo   | `elevenlabs/voices.ts` re-exports a response schema and never parses; `tiktok/get-content.ts` uses `fetcher<any>`. Only 4 real validation call-sites exist in all of `src/`                          |

## Shapes that permit misuse

| #   | Item                                                                                  | Status   | Note                                                 |
| --- | ------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| 13  | mtxx `sync_timeout` default                                                           | **Done** | `b1c35e4`                                            |
| 14  | `normalizeRequestConfig(urlOrConfig, config?)` accepts two shapes and merges silently | Todo     | Overloads would make the second form unrepresentable |
| 15  | `repository.record(eventName, eventJson, createdAt)` — three positionals, two strings | Todo     | Swapping the two strings compiles and writes garbage |

## Procedures that do not exist

| #   | Item                                                                                                                       | Status | Note                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | A PR template carrying the §5.5 gate block and the "which behaviour is now tested through which public interface" question | Todo   | The cheapest high-leverage step; works with or without the missing skills                                                                                                                                |
| 17  | `specs/` directory and a ticket template                                                                                   | Todo   | No spec exists in-tree, so nothing is reviewable before the code is written                                                                                                                              |
| 18  | The `retro`, `to-spec`, `to-tickets` and `implement-spec` skills                                                           | Todo   | All four are referenced by the `chief-of-staff` skill and **none are installed**. The audit recommends creating the artefacts before installing the skills, so the skills have something to work against |

## Deliberately not done, and why

- **Lowering the coverage threshold** to make a red gate green. The honest
  reading of a coverage drop is that the removed code was carrying the
  average; the fix is to test what is untested.
- **A fast subset for the pre-push hook.** The user chose the full gate
  deliberately: the point is that "the gate is green" means something.
- **Reformatting YAML by hand.** Each of the 13 files was re-parsed and
  compared against its previous content, to prove the change was semantically
  identical.

## Related

- [The environment does not fail loudly](../problems/environment-does-not-fail-loudly.md)
- [The gate cannot see most of the codebase](../problems/the-gate-cannot-see-most-of-the-codebase.md)
- [How work is delivered](../preferences/delivery.md)
