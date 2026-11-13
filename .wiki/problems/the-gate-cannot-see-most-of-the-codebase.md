# The gate cannot see most of the codebase

**Observed 2026-11-14**, by a pit-of-success audit of the environment. This is
the most important page in this section.

## The finding

`jest.config.ts` sets `coverageProvider: "v8"` and defines **no
`collectCoverageFrom`**. Under the v8 provider, only files a test actually
loaded are instrumented. The global 80% threshold is then applied to that
already-filtered set.

So the coverage number is an average over _the files that have tests_. It is
not an average over the codebase.

## What the number was measuring

At `a2f8486` the report read:

```
All files | 90.1 | 81.05 | 81.57 | 90.1
```

Which sounds excellent. It was measuring a biased sample.

## What it could not see

Diffing every `src` file against the coverage table, these were **absent
entirely** — not at low coverage, not in the denominator:

| Area                                                      | Files                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `apps/api/src/routes/**`                                  | all 18 routes                                                                |
| `apps/api/src/plugins/**`                                 | all 21 plugins                                                               |
| `apps/api-internal/src/**`                                | everything                                                                   |
| `apps/web/**`                                             | everything                                                                   |
| `apps/dashboard` components, pages, hooks                 | everything — only `lib/`, `features/*/utils.ts` and `models.ts` were covered |
| `packages/features/elevenlabs/src/{elevenlabs,client}/**` | all                                                                          |
| `packages/features/instagram/src/scraping/**`             | fsave, savefrom, videodropper                                                |
| `packages/features/mtxx/src/mtxx/**`                      | all seven operations                                                         |
| `packages/features/tiktok/src/tiktok/get-content.ts`      | —                                                                            |
| `packages/auth/billing/src/plugin/routes/**`              | all ~20 route handlers                                                       |
| `packages/auth/core/src/server/{database,plugins}.ts`     | —                                                                            |
| `packages/auth/mailer/src/renderer.ts`                    | —                                                                            |

And inside the measured set, there were holes:

| Module                                                  | Function coverage |
| ------------------------------------------------------- | ----------------- |
| `packages/auth/usage/src/adapter/redis.ts` (478 lines)  | 20.08%            |
| `packages/auth/usage/src/application/settlement.ts`     | 15.26%            |
| `packages/auth/billing/src/application/plan.service.ts` | 45.97%            |
| `packages/auth/billing/src/domain/proration.ts`         | 46.96%            |

`redis.ts` — the adapter that meters billable usage — was at 20% statements
and **0% functions**. Its uncovered range was lines 65-79, 81-87, 113-388 and
394-478: essentially the whole thing.

## The defects this let through

- Add a 400-line API route, or a new money calculation, and global coverage
  stays at 90.1%. The gate is green.
- A package can be rewritten to 0% coverage in a single commit and the gate
  stays green, as long as other packages hold the average.
- The 20%-covered Redis hot path was masked by 100%-covered Zod schema files.

This is the same shape as
[the coverage threshold hides holes](global-coverage-threshold.md) — that page
is about a global number hiding a hole; this one is about the number not
seeing most of the tree at all.

## The fix

Two config blocks, in the same commit so the tree never sits on a red gate:

1. **`collectCoverageFrom`** covering `packages/*/src/**`,
   `packages/*/*/src/**`, `apps/*/src/**`,
   `apps/*/{app,components,features,lib,hooks,shared}/**`.
2. **Per-path thresholds** — `coverageThreshold` accepts path globs, so
   `./packages/auth/usage/` can have its own floor and a 20% module cannot be
   averaged away by schema files.

The threshold is expected to fall sharply when this lands. That is the point:
the number stops being a flattering summary and starts being a measurement.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
- [The gate was red on the shared branch](gate-red-on-shared-branch.md)
