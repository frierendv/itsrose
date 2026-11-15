# ESM only, CommonJS dropped

**Analysed 2026-11-15 on branch `refactor/esm-only-migration`.** The analysis
is recorded here; the migration itself is not yet implemented.

## The verdict

**Yes, the whole monorepo can go ESM-only.** This is not a rewrite. The
source tree already _is_ ESM — the CommonJS that remains is a build artifact
plus two configuration gaps, and almost none of it is load-bearing.

Three facts carry the whole conclusion:

1. **Zero CommonJS in source.** No `require()`, no `module.exports`, no
   `exports.foo`, no `import x = require()` anywhere in `packages/` or
   `apps/`. The two Fastify applications derive their own `__dirname` from
   `import.meta.url`, so they are ESM-native too. What remains is nine
   `__dirname` sites in nine test files (see step 4) and two in the Next.js
   config files.
2. **Nothing consumes the CommonJS output.** The fourteen dual-format
   packages are consumed only by `apps/api` and `apps/api-internal`, both
   `"type": "module"` Node applications that run `node dist/main.mjs`.
3. **The ESM-only path is already proven in production.** Ten packages
   (`@itsrose/auth`, `@itsrose/auth-billing`, `@itsrose/auth-usage`,
   `@itsrose/auth-mailer`, `@itsrose/auth-storage`, `@itsrose/midtrans`,
   `@itsrose/react`, `@itsrose/types`, `api`, `api-internal`) already ship
   ESM-only, and the two Next.js applications already consume five of them.

The migration is therefore mostly _deleting a build output that nothing
reads_ — with three traps that are documented below.

## What CommonJS actually remains

### Surface 1 — The dual build output

The shared preset at `packages/standard/tsdown/tsdown.config.mjs` sets
`format: ["cjs", "esm"]`. Fourteen packages inherit it and therefore emit a
CommonJS `.js` bundle alongside the ESM `.mjs` bundle:

| Group                | Packages                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| Shared route surface | `packages/api-routes`                                                       |
| Core                 | `packages/core/system`                                                      |
| Features             | `packages/features/{character-ai,elevenlabs,instagram,mtxx,remini,tiktok}`  |
| Internal             | `packages/internal/{api-response,http-client,http-code,s3,upstream-client}` |
| Shared               | `packages/shared/shared-schema`                                             |

**This is already broken, and has been.** Each of these packages declares
`"type": "module"` while `dist/index.js` holds CommonJS code
(`Object.defineProperty(exports, Symbol.toStringTag, …)`). Node resolves the
module format of a `.js` file from the nearest `package.json`, so the file is
_treated as ESM_. Loading it through `import()` fails:

```
$ node --input-type=module -e "import('./packages/core/system/dist/index.js')"
Error: exports is not defined in ES module scope
This file is being treated as an ES module because it has a '.js' file
extension and '.../packages/core/system/package.json' contains "type": "module".
```

It survives only because the `exports` map takes precedence over `main` and
points at `./dist/index.mjs`. The `main` field still points at the broken
file. ESM-only removes the whole contradiction instead of documenting it.

### Surface 2 — The `require` conditions in `publishConfig`

Every one of the fourteen packages publishes a `publishConfig.exports` with a
`"require"` condition alongside the `"import"` condition:

```json
"publishConfig": {
  "exports": {
    ".": { "import": "./dist/index.mjs", "require": "./dist/index.js" }
  }
}
```

`npm publish` applies `publishConfig`, so the _published_ artifact advertises
a CommonJS entry point. This is the surface an external `require()` would
reach. Dropping CJS means these conditions disappear — they must not merely
be left to point at files that no longer exist.

### Surface 3 — The two Next.js applications are CJS-by-default packages

`apps/dashboard/package.json` and `apps/web/package.json` have no `type`
field, so Node treats them as CommonJS packages. Nothing breaks today —
Next.js compiles the app code itself — but it leaves the repository with two
different module conventions, and it makes Next emit a CommonJS standalone
`server.js` where an ESM one is available (step 3).

### Surface 4 — Jest runs on its CommonJS fallback

`jest.config.ts` uses `createDefaultEsmPreset` from `ts-jest`, which sets
`extensionsToTreatAsEsm` for `.ts`/`.tsx`. But the ESM path in Jest needs
`vm.SourceTextModule`, and Node 24.22.3 does not expose it without
`--experimental-vm-modules`:

```
$ node -e "console.log(typeof require('node:vm').SourceTextModule)"
undefined
```

So Jest silently falls back to its CommonJS loader. The observable
consequences, both confirmed by running the suite:

- `__dirname` **works** in test files.
- `import.meta` **throws**: `Must use import to load ES Module`.

Running the same suite with `NODE_OPTIONS=--experimental-vm-modules` flips it:

```
● Test suite failed to run
  ReferenceError: __dirname is not defined
    > 11 | const FIXTURES_DIR = join(__dirname, "..", "..", "fixtures");
```

No CommonJS is _published_ because of this, and no source file depends on it.
But it is the one place where the test environment's module semantics differ
from Node's, and it is why the nine `__dirname` sites in step 4 exist.

> **Updated 2026-11-15.** This surface is better removed than fixed. Vitest
> is ESM-native by construction, so
> [Moving from Jest to Vitest](vitest-migration.md) deletes the problem
> instead of solving it.

## Why it is safe — the consumer map

| Consumer            | Module system              | `@itsrose/*` packages it consumes                                                           | Format today        |
| ------------------- | -------------------------- | ------------------------------------------------------------------------------------------- | ------------------- |
| `apps/api`          | ESM (`node dist/main.mjs`) | api-response, api-routes, character-ai, elevenlabs, http-code, mtxx, remini, system, tiktok | **dual** + ESM-only |
| `apps/api-internal` | ESM (`node dist/main.mjs`) | api-response, api-routes, system                                                            | **dual** + ESM-only |
| `apps/dashboard`    | Next.js                    | auth, auth-billing, auth-usage, react, types                                                | ESM-only            |
| `apps/web`          | Next.js                    | react                                                                                       | ESM-only            |

Two consequences follow.

**The dual packages have no ESM-hostile consumer.** Every consumer of a
dual package is an ESM application. An ESM application resolving
`@itsrose/system` gets the `import` condition — the `.mjs` bundle. Turning
the package ESM-only changes nothing for it.

**The Next.js path is already proven.** `@itsrose/auth`, `@itsrose/auth-billing`,
`@itsrose/auth-usage`, `@itsrose/react` and `@itsrose/types` are ESM-only
today and are consumed by `apps/dashboard` without trouble. The migration
gives the remaining packages the treatment those five already survive.

Two supporting facts:

- **The dev path is already ESM.** The `devExports` mechanism points
  `exports` at raw `./src/*.ts`. Node 24 strips types natively
  (`process.features.typescript === "strip"`), so a development run already
  loads TypeScript source as ESM.
- **The tooling is already ESM.** `packages/standard/eslint/*.js` are ESM
  files in a `"type": "module"` package. `apps/api/scripts/build.js` uses
  `import.meta.dirname`. `astro.config.mjs` is ESM. `apps/waf-page` is
  `"type": "module"`.

## The migration plan

### Step 1 — Flip the shared preset

In `packages/standard/tsdown/tsdown.config.mjs`:

- `format: ["cjs", "esm"]` → `format: ["esm"]`
- delete the `if (format === "cjs")` branch in `outExtensions`
- **keep `legacy: true`** — see the trap below

### Step 2 — Rebuild so tsdown regenerates the export maps

`pnpm build` rewrites `exports` and `publishConfig.exports`. The `"require"`
conditions disappear on their own.

> **Trap.** `exports` is never hand-edited — `tsdown` is the sole source of
> truth (AGENTS.md §4.3). A manual edit to point `exports` at `./dist/*` or
> `./src/*` corrupts the package.

### Step 3 — Normalise the two Next.js applications

Add `"type": "module"` to `apps/dashboard/package.json` and
`apps/web/package.json`.

Both parts of this were verified against the installed Next.js 16.4.6, not
assumed:

- **`next.config.ts` keeps working.** Next transpiles it to CommonJS with
  SWC and evaluates it through `requireFromString`
  (`next/dist/build/next-config-ts/transpile-config.js`, `handleCJS`). The
  compiled code is never written to disk, so there is no "`.js` file inside an
  ESM package" problem, and `__dirname` keeps resolving to the app directory.
- **The standalone output becomes ESM automatically.** Next writes
  `import path from "node:path"` and an `import.meta.url`-based `__dirname`
  when `packageJson.type === "module"`
  (`next/dist/build/utils.js`, the `moduleType` branch). The app's
  `package.json` — including `type: module` — is copied into
  `.next/standalone/<app>/`, so the nearest `package.json` to `server.js`
  declares it ESM. The Docker `CMD ["apps/dashboard/server.js"]` is unchanged.

> **Caveat.** If `__NEXT_NODE_NATIVE_TS_LOADER_ENABLED=true` is ever set,
> Next imports `next.config.ts` natively and `__dirname` would break there.
> It is not set anywhere in the repo today. To be immune, replace
> `path.join(__dirname, "../../")` with
> `path.join(import.meta.dirname, "../../")` in both `next.config.ts` files.

### Step 4 — Make the test runtime genuinely ESM

> **Done 2026-11-15.** [Moving from Jest to Vitest](vitest-migration.md)
> landed on the same day. Vitest is ESM-native, so the step was deleted
> rather than performed — the port rewrote the nine `__dirname` sites
> anyway. There is no Jest and no `--experimental-vm-modules` flag left in
> the repository.
>
> The Jest-based route remains recorded here for the case where the Vitest
> migration is ever reverted.

Add `--experimental-vm-modules` to the Jest invocation, then convert the nine
`__dirname` sites in nine test files to `import.meta.dirname`:

- `packages/midtrans/__tests__/unit/{transport,signature,webhook-receiver}.test.ts`
- `packages/midtrans/__tests__/contract/{notification,fixtures,invoice-webhook}.test.ts`
- `packages/midtrans/__tests__/integration/{sandbox-simulator,card}.test.ts`
- `packages/auth/billing/__tests__/invoice-status.test.ts`

This is optional in the strict sense — no CommonJS is published without it —
but it removes the last behavioural difference between the test environment
and production, and it is the change that makes "ESM only" true of the whole
repository rather than only of its output.

### Step 5 — Let tsdown normalise the hand-written fields

`packages/api-routes/package.json` carries hand-written `main`,
`module` and `types` that disagree with every other package
(`./dist/index.js`, `./dist/index.mjs`, `./dist/index.d.ts`). tsdown
regenerates all three during step 2; the hand-written values simply stop
being the source of truth.

Note: `ts-node` stays _unless_ the Vitest migration lands, in which case
Jest goes and `ts-node` goes with it. Today it is load-bearing: Jest loads
`jest.config.ts` through it
(`jest-config/build/readConfigFileAndSetRootDir.js`, `loader === "ts-node"`),
even though no script names it.

## The trap that decides step 1: keep `legacy: true`

tsdown computes `legacy ??= !isPureESM`
(`tsdown/dist/options-*.mjs`, `generateExports`). A pure-ESM build therefore
defaults `legacy` to **false**, and with `legacy: false` the regeneration is
wrong:

| Field    | `legacy: true`       | `legacy: false` (the default for pure ESM)                 |
| -------- | -------------------- | ---------------------------------------------------------- |
| `main`   | `./dist/index.mjs`   | _removed_                                                  |
| `module` | `./dist/index.mjs`   | _removed_                                                  |
| `types`  | `./dist/index.d.mts` | `./dist/index.d.ts` — **stale, the file no longer exists** |

Both were observed by building `@itsrose/system` with `format: ["esm"]`.
`legacy: true` is already set in the preset, so step 1 is a pure deletion —
but the temptation to "clean up" `legacy` while making the package ESM-only
would silently point `types` at a non-existent file.

A second trap, in the same area: `publishConfig` is only rewritten when
`devExports` is on, i.e. during a **development** build. A production build
(`BUILDING=true`) leaves the committed `publishConfig` untouched. Step 2 must
therefore include a plain `pnpm build` and the regenerated
`publishConfig.exports` must be **committed** — otherwise the published
artifact keeps advertising a `require` condition for a file that is no longer
built.

## Risks

| Risk                                                                   | Likelihood                                                          | Mitigation                                                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A repository outside this monorepo `require()`s a `@itsrose/*` package | Unknown — the registry is private and cannot be inspected from here | Check the private registry's download log and its consumers before flipping. This is the one unknown in this analysis. |
| `publishConfig` keeps a stale `require` condition                      | Certain if step 2 is done as a production-only build                | Commit the regenerated `publishConfig`; verify no `"require"` key remains                                              |
| Jest's `--experimental-vm-modules` breaks `__dirname`                  | Certain                                                             | Nine sites in nine files, all mechanical                                                                               |
| Next standalone output changes shape                                   | Low                                                                 | Verified against the installed Next 16.4.6 source; the Docker `CMD` path is unchanged                                  |
| A dependency is CommonJS-only                                          | Low                                                                 | `@itsrose/auth` already imports `better-auth`, `pg` and friends from ESM-only output; interop is proven                |

## Effort

Four focused pull requests, in the order above:

1. Preset flip + rebuild — one line changed, one branch deleted.
2. Next.js `"type": "module"` — two lines, plus a dashboard build and a
   Docker smoke test.
3. Jest ESM — nine sites, one flag. **Or skip this: the Vitest migration
   replaces it** (see below).
4. Verification through the full gate: `pnpm format:check`, `pnpm lint`,
   `pnpm build`, `pnpm typecheck`, `pnpm test --coverage`.

Roughly a half-day of work plus the external-consumer check. The gate is the
real verification, and it is already wired to run in CI and in the pre-push
hook.

## Recommendation

Proceed. The change is a deletion, the blast radius is fourteen packages that
nothing loads the CommonJS half of, and the one genuine unknown — an external
consumer of the private registry — is answerable with a single query against
the registry's download log.

Sequence it so the risky part lands first: make the Next.js applications ESM
(step 3) before flipping the preset (step 1). If an external consumer turns
up, only the preset flip has to be revisited, and the rest of the work
stands.

**Updated 2026-11-15.** [Moving from Jest to Vitest](vitest-migration.md)
changes the sequencing. Vitest is ESM-native, so step 4 above is better
spent as a Vitest port than as a Jest flag — the port deletes step 4 rather
than performing it. The recommended order becomes:

1. **Vitest migration.** Larger, and it removes the Jest-ESM step entirely.
2. **Then the ESM-only build flip** (steps 1, 2 and 5 here). By then the
   suite already runs on a native ESM runner, so the ESM-only story is
   complete with no Jest flag anywhere.

Running the ESM flip first would mean paying for the `__dirname` conversion
twice.

## Related

- [Moving from Jest to Vitest](vitest-migration.md)
- [The gate was red on the shared branch](../problems/gate-red-on-shared-branch.md)
