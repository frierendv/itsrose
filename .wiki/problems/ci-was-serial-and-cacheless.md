# CI was one serial job that lost every cache

**Observed 2026-11-23, at `88c83d6`.** The workflow was correct in intent and
wasteful in every respect that costs money.

## What the workflow looked like

`.github/workflows/ci.yml` defined a single job, `ci`, running seven steps in
sequence on a 20-minute timeout: `format:check`, `lint`, `build`, `typecheck`,
`check:deps`, `test`. One runner did all of it, and a failure in step 2 hid
the verdicts of steps 3–7 entirely.

Three separate leaks compounded:

1. **The concurrency group keyed on `github.ref` alone.** On a
   `pull_request` event `github.ref` is `refs/pull/<n>/merge`, which is
   stable across pushes to the same PR — that part worked. The group is now
   keyed on the source branch instead (`github.event.pull_request.head.ref`),
   so the PR run and any push-triggered run for the _same branch_ cannot sit
   in different groups and both burn a runner.

2. **Turbo's remote cache was configured and never warm in CI.** `turbo.json`
   declares `.turbo/cache` as the local cache directory and the workflow
   passes `TURBO_API`/`TURBO_TOKEN`/`TURBO_TEAM`, so the remote cache works —
   but no `actions/cache` step restored `.turbo/cache`, and the runners are
   ephemeral. Every job started from zero.

3. **The test suite was ~42 s of which ~18 s was coverage.** Measured on a
   24-core developer machine: `vitest run --coverage --maxWorkers=2` takes
   40.0 s end to end; the same command with `--no-coverage` takes 23.0 s. The
   v8 coverage instrumentation is not free, and `--maxWorkers=2` is pinned on
   purpose (see [the gate was red on the shared branch](gate-red-on-shared-branch.md)),
   so the suite does not scale with runner size.

## What was measured before anything was changed

All on a 24-core host, warm `node_modules`, `.turbo` cache empty:

| Step                      | Wall clock | Notes                             |
| :------------------------ | :--------: | :-------------------------------- |
| `pnpm format:check`       |   15.5 s   | prettier over the tree + syncpack |
| `pnpm check:deps`         |   1.1 s    | one `tsx` process                 |
| `pnpm lint`               |   23.1 s   | turbo, 28 packages, cold          |
| `pnpm typecheck`          |   37.6 s   | turbo, 28 packages, cold          |
| `pnpm build`              |   39.6 s   | turbo, 29 packages, cold          |
| `pnpm test` (coverage)    |   40.0 s   | 161 files, 1451 tests             |
| `pnpm build` (warm cache) |   2.3 s    | `>>> FULL TURBO`, 29/29 cached    |

The serial sum is ~157 s of compute. The build alone is 40 s cold and 2.3 s
warm, so the cache is worth more than any restructuring.

## What changed

1. **Three jobs, run concurrently**: `quality` (a 4-way matrix: `format`,
   `lint`, `deps`, `typecheck`), `test`, and `build`. No `needs:` between
   them. The run's wall clock is now the slowest job instead of the sum.

    The test job does **not** depend on the build, because it does not read
    `dist/`. The Vitest projects resolve `@itsrose/*` through `workspaceAliases`
    in `vitest.config.mts`, which point at each package's `src/` directory.
    Verified by deleting `dist/` from `packages/core/system`,
    `packages/internal/http-code` and `packages/auth/storage` and running the
    suite: 161 files, all green. That is what makes the parallel split safe
    rather than lucky — and it is also what makes the far more expensive
    alternative (upload the built tree as an artifact, download it in the test
    job) unnecessary. That artifact would have been ~2.8 GB per run
    (`apps/dashboard/.next` is 1.3 GB, `apps/web/.next` 160 MB, `node_modules`
    1.2 GB).

2. **`actions/cache` on `.turbo/cache` in the build job.** A miss costs a
   full build; a hit costs 2.3 s. `restore-keys` lets a new commit reuse the
   most recent archive, which is exactly what turbo's content-addressed
   cache wants — the keys never match by design, the restored _contents_ do.

3. **`--prefer-offline` on install**, so the `setup-node` pnpm-store cache is
   reused without a registry round-trip per tarball. `--frozen-lockfile`
   still fails when the lockfile and the manifests disagree.

4. **`outputs: []` on `lint` and `typecheck`.** Neither writes anything, so
   declaring that keeps their cache entries to ~200 bytes of manifest
   metadata instead of hashing the whole project directory.

5. **`lint` and `typecheck` are turbo tasks**, so each package that a PR did
   not touch replays from the remote cache instead of re-running `eslint` or
   `tsc` over it.

## The `waf-page` build was failing for a reason nobody had seen

The Astro build aborted with:

```
ENOENT: no such file or directory, mkdir '/home/node/.config/astro'
```

`@astrojs/telemetry`'s `notify()` calls `this.config.set(...)` — which
`mkdir`s `$XDG_CONFIG_HOME/astro` (default `$HOME/.config/astro`) — _before_
it checks whether telemetry is disabled. On any host where `$HOME` is not
writable, the build dies before it compiles a single page. This is not a CI
quirk; it reproduces locally in any sandboxed or container-mounted home.

Two false starts, both worth recording because they look right:

- **Pointing `XDG_CONFIG_HOME` at a directory inside the workspace did not
  work through turbo.** Turbo runs in strict env mode, so an undeclared
  variable is stripped from the task environment. Declaring it in
  `turbo.json` `globalEnv` fixes that, and `--env-mode=loose` proves the
  diagnosis — but the variable then has to stay in sync across `ci.yml` and
  `turbo.json` to keep working.
- **Writing the preference file ahead of time did not work either**, because
  `notify()` reads the config and _then_ writes it. A pre-seeded
  `{"telemetry":{"enabled":false}}` still goes through the `mkdir`.

The fix that holds is the documented opt-out, `ASTRO_TELEMETRY_DISABLED=1`,
set in the `waf-page` `build` script itself. It is checked first in
`get isDisabled`, so the config file is never touched. It lives with the app
rather than in the workflow, so a local `pnpm build` gets it too — and because
turbo strips undeclared variables, it is also declared in `turbo.json`
`globalEnv`.

## What the numbers should look like

Cold cache, no remote hits: the run costs the slowest job, ~120 s of compute
(~160 s before) — a modest win.

Warm remote cache, the common case for a PR that touches one or two packages:
`lint`, `typecheck` and `build` replay almost entirely, and the run is bounded
by `test` at ~45 s plus install. That is the change worth having, and it is
what (2), (4) and (5) buy.

## The general lesson

The gate was not _wrong_, so nobody looked at it. The cost of a CI job is
invisible on a green check — the same shape as [the environment does not fail
loudly](environment-does-not-fail-loudly.md), except the damage is budget
rather than correctness. Two habits would have caught all of this: restoring
the cache directory a build tool is already told to use, and asking whether a
downstream job actually reads the upstream job's output before making it
wait for one.
