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

Landed at `9f24292`. Two config blocks, in one commit so the tree never sat
on a red gate:

1. **`collectCoverageFrom`** covering the whole source tree.
2. **Nine per-path thresholds** — `coverageThreshold` accepts path globs, so
   a 20% module cannot be averaged away by schema files.

Two projects also had to mount a neighbour's directory: the coverage
reporter can only add untested files that live inside a project's `roots`,
so `apps/api-internal` and `apps/web` were structurally invisible until they
were mounted from `apps/api` and `apps/dashboard`.

### What the number actually was

|                 |                          Before |                       After |
| --------------- | ------------------------------: | --------------------------: |
| Denominator     | 294 files (those a test loaded) | 754 files (the source tree) |
| Global coverage |                          90.30% |                  **41.65%** |

Per area, after:

| Area                                 | Coverage | Why                                                |
| ------------------------------------ | -------: | -------------------------------------------------- |
| `packages/core/`, `packages/shared/` |     100% | genuinely covered                                  |
| `packages/internal/`                 |   80.79% | genuinely covered                                  |
| `packages/midtrans/`                 |   80.77% | genuinely covered                                  |
| `packages/auth/`                     |   59.56% | the Redis adapter and several application services |
| `packages/features/`                 |   48.42% | untested client layers                             |
| `packages/react/`                    |   31.81% |                                                    |
| `apps/dashboard/`                    |   11.88% | no component or hook test                          |
| `apps/api/`                          |    9.37% | 18 routes and 21 plugins untested                  |
| `apps/api-internal/`                 |       0% | no test project at all                             |
| `apps/web/`                          |       0% | no test project at all                             |

`packages/features` and `packages/react` had _read_ as ~100% before —
precisely because their untested files were invisible.

### The floors

Each floor is the package's **real** number, not a target, so the gate is
green today and turns red on the first regression. `apps/api` has a 9% floor
because its routes are untested; `apps/api-internal` and `apps/web` carry an
explicit 0 floor rather than being excluded, so their numbers stay visible
and start protecting them the moment a test lands.

The global threshold stayed at 80. It was not lowered to make the numbers
fit — that was explicitly rejected in this repo's history.

A targeted run (`--selectProjects`) now enforces the floor of the project it
selected, instead of failing with "Coverage data for ... was not found" for
every project that did not run.

### What is now visible that was not

- `packages/auth/usage/src/adapter/redis.ts` — 96/478 statements, **0/5
  functions**. The adapter that meters billable usage.
- `packages/auth/mailer/src/renderer.ts` — 0/26 statements.
- `packages/auth/billing/src/application/plan.service.ts` — 45.97%.
- `packages/auth/billing/src/domain/proration.ts` — 46.96%.
- `packages/features/mtxx` — 5.41%. `elevenlabs` — 26.43%. `tiktok` — 12.60%.

### The honest caveats

- **`.astro` is not counted.** `apps/waf-page` has 16 of them, no Jest
  project, and Astro components are not transformable by ts-jest.
- **30 pure-type modules** are inside the denominator and contribute 2,114
  uncovered statements (4.1% of the total). They compile to empty modules,
  so under the v8 provider they count as uncovered. They were left in rather
  than filtered by file name, because a `types.ts` glob would silently drop
  real runtime code in files that happen to be named that way.
- **`packages/types` and `packages/standard` are excluded** — zero-runtime
  type-only package, and tooling presets.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
- [The gate was red on the shared branch](gate-red-on-shared-branch.md)
