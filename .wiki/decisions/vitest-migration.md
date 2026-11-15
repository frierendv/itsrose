# Moving from Jest to Vitest

**Analysed and landed 2026-11-15 on branch `refactor/vitest-migration`.**

The suite now runs on Vitest 5. The analysis below is kept as the record of
what the move was based on; the sections marked _Landed_ describe what
actually happened.

## The verdict

**Yes, and it should be done — but it changes the shape of the ESM plan
rather than simply adding to it.**

The decisive argument is not speed or ergonomics. It is that **Vitest is
ESM-native, and that removes the hardest step of the ESM-only migration
entirely.**

[ESM only, CommonJS dropped](esm-only-runtime.md) identifies four remaining
CommonJS surfaces. Surface 4 is the test runner: `jest.config.ts` asks
ts-jest for the ESM preset, but Node 24.22.3 does not expose
`vm.SourceTextModule` without `--experimental-vm-modules`, so Jest silently
falls back to its CommonJS loader. Making Jest genuinely ESM means adding a
flag and rewriting nine `__dirname` sites in nine test files.

Vitest is ESM by construction. Porting the suite to Vitest **deletes** that
problem rather than solving it: `import.meta.dirname` simply works, and the
nine `__dirname` sites have to change anyway because the whole suite is
being rewritten.

> **The two pieces of work collapse into one.** If Vitest is going to happen,
> do not spend effort on Jest's `--experimental-vm-modules` step. It would be
> thrown away.

## What the suite actually uses

107 test files across 10 Jest projects. The inventory is small and unusually
clean — there are no snapshots, no custom matchers, no `done` callbacks, and
no `jest.setTimeout`:

| Jest API                      | Call sites | Vitest equivalent                    | Notes                       |
| ----------------------------- | ---------- | ------------------------------------ | --------------------------- |
| `jest.fn()`                   | 86         | `vi.fn()`                            | mechanical                  |
| `jest.spyOn()`                | 34         | `vi.spyOn()`                         | mechanical                  |
| `jest.Mock` (type)            | 18         | `import type { Mock } from "vitest"` | type-only                   |
| `jest.mockRestore()`          | 7          | `vi.restoreAllMocks()`               | mechanical                  |
| `jest.useFakeTimers()`        | 6          | `vi.useFakeTimers()`                 | see the timer note          |
| `jest.clearAllMocks()`        | 5          | `vi.clearAllMocks()`                 | see the `clearMocks` note   |
| `jest.mock()`                 | 10         | `vi.mock()`                          | 2 need an async factory     |
| `jest.useRealTimers()`        | 4          | `vi.useRealTimers()`                 | mechanical                  |
| `jest.advanceTimersByTime()`  | 4          | `vi.advanceTimersByTime()`           | mechanical                  |
| `jest.setSystemTime()`        | 2          | `vi.setSystemTime()`                 | mechanical                  |
| `jest.requireActual()`        | 2          | `await vi.importActual()`            | **async — different shape** |
| `jest.mocked()`               | 1          | `vi.mocked()`                        | identical                   |
| `jest.mockReset()`            | 2          | `vi.mockReset()`                     | **different semantics**     |
| `import from "@jest/globals"` | 5 files    | `import from "vitest"`               | mechanical                  |

Timers map one-to-one: the suite uses only `useFakeTimers`,
`useRealTimers`, `advanceTimersByTime` and `setSystemTime`, all of which
Vitest supports with the same names. Vitest does not support Jest's _legacy_
timers, but the suite does not use them.

`jest.mock` factories: eight of the ten return an object of named exports,
which Vitest accepts unchanged. Two need work — the factories that call
`jest.requireActual` must become **async** factories using
`await vi.importActual()`:

```ts
// today
jest.mock("@itsrose/system", () => {
	const actual = jest.requireActual("@itsrose/system");
	return { ...actual, getEnv: jest.fn() };
});

// vitest
vi.mock("@itsrose/system", async () => {
	const actual =
		await vi.importActual<typeof import("@itsrose/system")>(
			"@itsrose/system"
		);
	return { ...actual, getEnv: vi.fn() };
});
```

All ten `jest.mock` calls already sit at the top level of their file, which
matters: Vitest 5.0 **throws** if `vi.mock` appears nested in a function or
`describe` block.

## The configuration mapping

`jest.config.ts` is 380 lines of a single root config with a `projects`
array. Vitest's `test.projects` maps onto it one-to-one, and the ten project
names carry over unchanged.

| Jest                         | Vitest                                  | Notes                                          |
| ---------------------------- | --------------------------------------- | ---------------------------------------------- |
| `projects` + `displayName`   | `test.projects` + `name`                | inline projects; names must be unique          |
| `roots` + `testMatch`        | `root` + `include`                      | `include` is a glob relative to `root`         |
| `moduleNameMapper`           | `resolve.alias`                         | **no array-of-candidates support** — see below |
| `transformIgnorePatterns`    | `server.deps.inline`                    | same three packages                            |
| `testEnvironment: "jsdom"`   | `environment: "jsdom"`                  | needs `jsdom` as a direct dependency           |
| `setupFilesAfterEnv`         | `setupFiles`                            | Vitest 5 merges arrays rather than replacing   |
| `collectCoverageFrom`        | `coverage.include` + `coverage.exclude` | `!` negations must be split                    |
| `coverageThreshold`          | `coverage.thresholds`                   | glob patterns supported                        |
| `coverageProvider: "v8"`     | `coverage.provider: "v8"`               | Vitest's default                               |
| `injectGlobals` (default on) | `globals: true`                         | **must be set explicitly**                     |
| `--selectProjects`           | `--project`                             | supports `*` and `!`                           |
| `maxWorkers`                 | `maxWorkers`                            | identical                                      |
| `--verbose`                  | `--reporter=verbose`                    | renamed                                        |

Three of these need a decision rather than a translation.

### `moduleNameMapper` → `resolve.alias`

Jest's mapper can point one pattern at an **array** of candidate roots:

```js
"^@itsrose/([^/]+)$": [
	"<rootDir>/packages/core/$1/src",
	"<rootDir>/packages/features/$1/src",
	"<rootDir>/packages/internal/$1/src",
	"<rootDir>/packages/shared/$1/src",
	"<rootDir>/packages/$1/src",
]
```

Vite's `resolve.alias` replaces the matched portion of the specifier and has
no notion of "try these in order". The array must become explicit entries —
one per package, fourteen in total. This is more verbose but far less
ambiguous, and it fails loudly at configure time instead of silently
resolving to the wrong directory.

The two `__mocks__` overrides (`better-auth/api`,
`@better-auth-ui/core`) and the seven `api-routes` stubs become ordinary
alias entries. The `__mocks__` **directory convention** does not need
preserving: Vitest does not auto-load `<root>/__mocks__` the way Jest does,
but this repo reaches those files through an explicit mapper, not through
the convention.

### `globals: true`

Jest injects `describe`, `it` and `expect` as globals by default. Vitest
does not. Five files import them explicitly from `@jest/globals`; the other
102 rely on the global.

Enabling `globals: true` is the low-friction path and keeps the diff small.
It needs a matching TypeScript change — `"types": ["vitest/globals"]` in the
test tsconfigs — or the globals will not typecheck.

The alternative is adding `import { describe, expect, it } from "vitest"` to
every file. That is 107 files of churn for no functional gain. **Use
`globals: true`.**

`@testing-library/jest-dom` already ships a `./vitest` entry
(`node_modules/@testing-library/jest-dom/package.json`), so the `react` and
`dashboard` projects switch their setup file to
`@testing-library/jest-dom/vitest`.

### Coverage: the hard part

This is the one genuinely difficult piece, and it deserves its own section.

The repo does not use a plain coverage threshold. It has a **global floor of
80%** plus **twelve per-path floors**, each measured, each commented with
the reasoning. The wiki records why: [A global coverage threshold hides
holes](../problems/global-coverage-threshold.md) — 80% globally while a
478-line module sat at 20%. The per-path floors are the fix, and they are
load-bearing.

Vitest supports per-glob thresholds, so the shape maps:

```ts
coverage: {
	thresholds: {
		branches: 80, functions: 80, lines: 80, statements: 80,
		"packages/api-routes/**": { branches: 85, functions: 55, lines: 90, statements: 90 },
		// …one per path group
	},
}
```

Three things make this harder than it looks.

1. **The global floor means something different.** The Vitest docs state it
   plainly: _"Vitest counts all files, including those covered by
   glob-patterns, into the global coverage thresholds. This is different from
   Jest behavior."_ Under Jest, the global floor covered only the files no
   path group claimed. Under Vitest it covers everything. The global 80% must
   be re-derived, not copied.
2. **The numbers themselves will move.** Jest's v8 provider and Vitest's v8
   provider remap coverage differently. All twelve floors were measured
   against Jest's numbers and every one of them has to be re-measured.
3. **`collectCoverageFrom` uses `!` negations.** Vitest has separate
   `coverage.include` and `coverage.exclude` arrays. The existing list
   (`packages/types/**`, `packages/standard/**`, `__tests__/**`, `__mocks__/**`,
   `next.config.*`, `eslint.config.*`, `tsdown.config.*`, `*.d.ts`) splits
   cleanly along that line.

The plan: port the structure, run the suite once, read the measured numbers,
and set the floors from the measurement — the same discipline the original
floors were built with. The repo's own `coverage.thresholds.autoUpdate`
option only raises a floor when coverage is _better_, so it cannot lower a
floor that Jest's numbers made look better than they are. It is a
convenience, not a re-baselining tool.

The conditional logic that reads `--selectProjects` from `process.argv` and
drops the floors of projects that did not run becomes the same logic reading
`--project`.

### Decided 2026-11-15: the thresholds are not ported

The coverage floors are **out of scope for this migration**. The suite runs,
the coverage report is still produced, and the thresholds are absent from
`vitest.config.mts` with a comment saying why.

This is a deliberate deferral, not an oversight. The floors were measured
against Jest's numbers; Vitest counts glob-matched files into the global
threshold; and carrying the old numbers across would make the gate assert
something false — a floor that fails for the wrong reason is worse than no
floor, because it teaches the team to ignore the gate.

**What is lost until the floors come back:** the per-path guard that
[A global coverage threshold hides holes](../problems/global-coverage-threshold.md)
was built to provide. The global number alone cannot replace it — that is the
whole point of the page. Re-measuring the twelve floors is the outstanding
work, and it is listed under _What is still open_.

## The behavioural differences that will bite

Ranked by how likely they are to cost time.

### 1. `clearMocks` defaults to `true` in Vitest 5

Jest's `clearMocks` is off by default. **Vitest 5 turned it on.** Vitest now
calls `vi.clearAllMocks()` before every test, clearing recorded call history
while leaving implementations intact.

This is invisible in the five files that call `jest.clearAllMocks()`
explicitly — they wanted clearing anyway. It is visible everywhere else: any
test that asserts on accumulated calls across test cases now sees a cleared
history. The Vitest 5 guide names exactly this as the most affected
pattern: _"Tests that record calls outside of the test body (for example in
a setup file, at the top level of a module, or in a `beforeAll` hook) are the
most affected."_

The repo has `beforeAll` hooks in six files that start local HTTP servers,
and `beforeEach`/`afterEach` hooks that mutate `process.env`.

**Decision: set `clearMocks: false` explicitly.** It matches Jest exactly,
keeps the diff to the API renames, and removes a whole class of surprise. The
five explicit `jest.clearAllMocks()` calls keep working unchanged.

### 2. `sequence.hooks` defaults to `stack`

Jest runs `afterEach` and `afterAll` in declaration order within a block.
Vitest's default `stack` reverses the "after" hooks.

The repo has `afterEach` in ten files and `afterAll` in six. Some of them
tear down servers and restore `process.env` — order matters when one teardown
depends on another's setup having run.

**Decision: set `sequence.hooks: "list"`** to match Jest exactly. One line,
removes the risk.

### 3. `mockReset` means the opposite thing

Jest's `mockReset` replaces the implementation with an empty function that
returns `undefined`. Vitest's `mockReset` restores the mock to its
**original** implementation.

Two call sites. Each needs to be read, not mechanically translated — a
Jest-semantics `mockReset` becomes `vi.mockReset()` followed by an explicit
`vi.mockImplementation(() => undefined)` where the old behaviour mattered.

### 4. `mock.mock` is a persistent reference in Vitest

Jest recreates the state object on `mockClear()`, so a captured `mock.mock`
reference goes stale. Vitest holds a persistent reference. This only matters
if a test captures `mock.mock` and expects it to change — a rare pattern, and
it currently appears nowhere in the suite.

### 5. `expect.getState().currentTestName` joins with `>`, not a space

Only matters for `-t` patterns that span a suite and a test name. The repo
uses no name filters in CI. The `testNamePattern` CLI flag has the same
change.

### 6. `vi.mock` factories must be top-level

Already satisfied — all ten call sites are top-level.

## What does not need changing

- **No snapshots.** Zero `toMatchSnapshot` / `toMatchInlineSnapshot` in the
  suite, so there is no snapshot churn and no `snapshotFormat` difference to
  reconcile.
- **No custom matchers.** Zero `expect.extend`.
- **No `done` callbacks.** Vitest does not support them; the suite does not
  use them.
- **No `jest.setTimeout`.** The suite relies on the default.
- **No `process.cwd()` in tests.** Vitest keeps `process.cwd()` at the launch
  directory rather than the project root, which would have been a problem.
  The suite never uses it; the nine `__dirname` sites become
  `import.meta.dirname`, which is file-relative and unaffected.
- **No `JEST_WORKER_ID`.** Vitest exposes `VITEST_POOL_ID` instead; the
  suite never reads it.
- **`@testing-library/jest-dom` already ships a `./vitest` entry.** No new
  dependency, and the version in the tree (7.0.1) is current.

## The version matrix

| Package                     | Version | Note                                                                                          |
| --------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `vitest`                    | 5.1.0   | requires Node `^22.12 \|\| ^24 \|\| >=26` — the repo is on 24.22.3 ✓                          |
| `@vitest/coverage-v8`       | 5.1.0   | must match `vitest` exactly                                                                   |
| `vite`                      | 8.3.8   | **required peer dependency** — Vitest 5 no longer bundles it                                  |
| `jsdom`                     | 31.0.1  | currently 26.1.0, transitively via `jest-environment-jsdom` — must become a direct dependency |
| `@testing-library/jest-dom` | 7.0.1   | already installed, already has the `./vitest` entry                                           |

Vitest 5 also requires Vite >= 6.4.0, and `vite` must be added explicitly to
the root `devDependencies` — it is no longer a direct dependency of `vitest`.

## The migration plan

### Step 1 — Dependencies and the config skeleton

Add `vitest`, `@vitest/coverage-v8`, `vite` and `jsdom` to the root
`devDependencies`. Remove `jest`, `ts-jest` and `jest-environment-jsdom`.

Write `vitest.config.ts` with the ten projects, their `include` globs, the
`resolve.alias` entries, `server.deps.inline`, `globals: true`,
`clearMocks: false`, `sequence.hooks: "list"`, and the coverage structure
with **placeholder** floors.

### Step 2 — Port the test files

A scripted rename handles the bulk — `jest.fn` → `vi.fn`, `jest.spyOn` →
`vi.spyOn`, the timer calls, `jest.mocked`. Then hand-fix the rest:

- the two `jest.requireActual` factories become async `vi.importActual`
- the two `jest.mockReset` call sites
- the five `@jest/globals` imports become `vitest`
- the eighteen `jest.Mock` type references become `Mock` from `vitest`
- the nine `__dirname` sites become `import.meta.dirname`

Add `"types": ["vitest/globals"]` to the test tsconfigs.

### Step 3 — Re-baseline the coverage floors

Run the suite with coverage, read the measured numbers per path group, and
set the twelve floors and the global floor from the measurement.

This step must not be skipped or approximated. The floors are the mechanism
the repo built to stop a global number from hiding an uncovered module, and
copying Jest's numbers across would leave the gate asserting something
false.

### Step 4 — Wire the scripts and the gate

- `pnpm test` → `vitest run --coverage --maxWorkers=2`
- CI: `pnpm test --ci --reporter=default` — `--testLocationInResults` has no
  equivalent because Vitest always reports locations
- The pre-push hook is unchanged; it calls `pnpm test --coverage`

### Step 5 — Run the full gate

`pnpm format:check`, `pnpm lint`, `pnpm build`, `pnpm typecheck`,
`pnpm test --coverage`.

The lint step needs attention: the ESLint preset in `packages/standard`
has Jest-specific rules that must be checked against the Vitest globals, and
the `no-undef` behaviour for `describe`/`it`/`expect` changes from Jest's
injection to Vitest's.

## Risks

| Risk                                                            | Likelihood                 | Mitigation                                                        |
| --------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| Coverage floors are wrong after the port                        | Certain if not re-measured | Step 3 is a gate, not a formality                                 |
| `clearMocks` default silently changes assertions                | Medium                     | `clearMocks: false` set explicitly                                |
| `sequence.hooks` reorders teardown                              | Medium                     | `sequence.hooks: "list"` set explicitly                           |
| `mockReset` semantics inverted                                  | Medium                     | Two sites, each read by hand                                      |
| `resolve.alias` does not reproduce the candidate-root behaviour | Medium                     | Fourteen explicit entries; verify every import resolves to source |
| jsdom version bump changes DOM behaviour                        | Low                        | Two jsdom projects; the React suite is small                      |
| Vitest 5.1.0 is a new major                                     | Low                        | The three changes that affect this suite are covered above        |

## Effort

Larger than the ESM-only migration, but still bounded, and most of it is
mechanical:

1. Dependencies and config — half a day.
2. Test file port — one to two days, mostly script-driven.
3. Coverage re-baseline — half a day.
4. Scripts, CI, lint preset — half a day.

Call it three to four days, against the roughly half a day of the ESM-only
migration.

## Recommendation

**Do it, and let it replace the Jest-ESM step of the ESM-only plan.**

The sequencing that follows from this:

1. **Vitest migration first.** It is the larger piece, it removes the
   `--experimental-vm-modules` work entirely, and the nine `__dirname` sites
   get fixed as part of the port.
2. **Then the ESM-only build flip** (steps 1, 2, 3 and 5 of the ESM page).
   By then the test suite is already running on a native ESM runner, so the
   ESM-only story is complete without any Jest flag.

Running the ESM flip first and the Vitest port second would mean paying for
the `__dirname` conversion twice.

Two things to settle before starting:

- **The `globals: true` decision.** The recommendation is to enable it and
  add `"types": ["vitest/globals"]`. The alternative — importing from
  `vitest` in all 107 files — is cleaner in principle and 107 files of churn
  in practice.
- **The coverage floor re-baseline.** It needs a deliberate session with the
  numbers in front of you, the way the original floors were set. It should
  not be delegated to `autoUpdate`.

## Landed

**2026-11-15, branch `refactor/vitest-migration`, commit `059bd53`.**

The migration is done. `globals: true` was chosen, the coverage thresholds
were left out, and the suite runs on Vitest 5.1.0.

### The equivalence

The Jest baseline was measured on the pre-migration tree, not assumed:

|            | Jest 30.5.2                 | Vitest 5.1.0                |
| ---------- | --------------------------- | --------------------------- |
| Test files | 105 passed, 2 skipped (107) | 105 passed, 2 skipped (107) |
| Tests      | 910 passed, 5 skipped (915) | 910 passed, 5 skipped (915) |
| Wall clock | 5.4 s                       | 10.6 s                      |

The two skipped files are the Midtrans sandbox tests, which are gated on
`MIDTRANS_INTEGRATION=1` and credentials. Every test that ran under Jest
runs under Vitest, and every one that passed still passes.

### The four things that were not a rename

**A mock used as a constructor needs a constructible implementation.**
Vitest constructs a mock with `Reflect.construct(implementation, …)`, so an
arrow function cannot be constructed — `mockImplementation(() => mockWs)`
fails with _"() => mockWs is not a constructor"_. The implementation has to
be a `function` expression. Two sites: the `ws` automock and the
`ChatSocket` automock in `packages/features/character-ai`.

**`vi.importActual` is async, and the factory with it.** The two factories
that reached for `jest.requireActual` became async factories. The `image-size`
one also had to spread the real module, because the original replaced a
single export and the port now spreads the namespace.

**Vite's alias plugin matches a string exactly or as a path prefix.** The
`@/` prefix therefore never matched: `"@/"` plus a slash is `"@//"`. The
dashboard and API aliases use the regular expression `/^@\//` instead.

**Opting out of project inheritance loses the root settings.** The
`api-routes` project sets `extends: false`, because its stubs have to come
before the workspace aliases and inherited aliases are merged ahead of the
project's own. That also cost it `globals: true`, `clearMocks` and
`sequence.hooks`, so they are repeated on the project.

### The pool matters more than the worker count

The first working run took 25 seconds — five times the Jest baseline. The
cause was not the tests: `jsdom was created 15 times`, once per file, and
that was 89% of the tracked time.

The `vmThreads` pool creates the environment once per worker and keeps the
per-file isolation. Under the two-worker cap the test script sets:

| Pool                  | Workers   | Wall clock |
| --------------------- | --------- | ---------- |
| `forks` (the default) | 2         | 25.0 s     |
| `vmThreads`           | 2         | 10.6 s     |
| `forks`               | unlimited | 5.2 s      |
| `vmThreads`           | unlimited | 6.9 s      |

`pool: "vmThreads"` is the right choice under the cap, because a CI runner
has few cores and the environment cost dominates. On a many-core machine the
default pool with unlimited workers wins — but the script caps the workers
on purpose; the cap replaced `--runInBand` in `da1ab94`.

### What is still open

1. **The coverage floors.** Twelve per-path floors plus a global floor, to be
   re-measured against Vitest's numbers and re-added to `vitest.config.mts`.
   Until then the gate has no coverage teeth.
2. **The ESM-only build flip.** Steps 1, 2, 3 and 5 of
   [ESM only, CommonJS dropped](esm-only-runtime.md). The Jest-ESM step
   between them is now done by this migration.

## Related

- [ESM only, CommonJS dropped](esm-only-runtime.md)
- [A global coverage threshold hides holes](../problems/global-coverage-threshold.md)
- [The gate cannot see most of the codebase](../problems/the-gate-cannot-see-most-of-the-codebase.md)
