# Unused dependencies were nobody's job

**Observed 2026-11-17**, by an audit of the dependency graph.

The repository already had a tool for this. `packages/standard/tsdown/tsdown.config.mjs`
enabled tsdown's `unused` option, which runs `unplugin-unused` over every
package that builds with the shared preset. It reported unused dependencies on
every build.

Nothing read the report. The check was configured `level: "warning"`, and the
warning was printed after the build had already succeeded — so the build was
green, the report scrolled past, and the dead dependencies stayed.

## What was found

Nine dependencies were declared and never used, across eight workspaces:

| Workspace                       | Unused dependency             | Why it was there                                          |
| ------------------------------- | ----------------------------- | --------------------------------------------------------- |
| `packages/features/*` (×6)      | `@itsrose/http-client`        | Left behind by the move to `@itsrose/upstream-client`     |
| `packages/features/instagram`   | `@itsrose/system`             | Same — `upstream-client` provides it                      |
| `apps/api`                      | `@itsrose/auth-mailer`        | `@itsrose/auth` provides it; `apps/api` never imported it |
| `apps/api`, `apps/api-internal` | `openapi-types`               | Never imported                                            |
| `apps/api`                      | `@itsrose/http-code`          | `api-response` provides it                                |
| `apps/api-internal`             | `@types/ws`                   | No websocket route in this app                            |
| `apps/web`                      | `clsx`, `tailwind-merge`      | `cn` comes from `@itsrose/react/core`                     |
| `apps/web`, `apps/dashboard`    | `babel-plugin-react-compiler` | Both apps use Turbopack's Rust React Compiler             |
| `packages/standard`             | `eslint-plugin-only-warn`     | Not registered in any preset                              |

The feature packages were the tell. Commit `a5d8458` moved all six of them
onto `@itsrose/upstream-client`, which depends on `@itsrose/http-client` — so
the direct edge became transitive, and the direct declaration was left behind.
The dependency was still installed, still resolvable, and still declared. Only
the import had gone.

## Two of them were false positives, and the tool was right to report them

`@better-auth-ui/react` and `react-email` in `packages/auth/mailer` are
genuinely required, and the tool could not see why:

- `packages/auth/mailer/src/service.ts` imports `@better-auth-ui/heroui/email`.
- `@better-auth-ui/heroui/dist/email.js` imports `@better-auth-ui/react/email`.
- `@better-auth-ui/react/dist/email.js` imports `react-email`.

Neither name appears in the mailer's own source, so a source scan cannot find
them. They are now listed in `unused.ignore` in
`packages/auth/mailer/tsdown.config.ts`, with the reason in a comment.

`packages/react` already used this mechanism — `unused: { ignore: [...] }` for
`react-dom` and `tailwindcss`. The mailer follows that pattern.

## The check never gated anything

`level: "warning"` prints the report; `level: "error"` fails the build. The
preset used `warning`, so `pnpm build` exited 0 on a package with an unused
dependency. Verified directly: `pnpm --filter @itsrose/tiktok build` exited 0
while reporting `Unused 1 dependencies found`.

The preset now uses `level: "error"`. Verified the other way round too — adding
`left-pad` to `packages/features/tiktok` fails the build, and removing the
mailer's `ignore` entries fails the mailer's build.

## The check could not see three things

`unplugin-unused` reads the files that pass through the bundler. That is the
source tree of the packages that build with tsdown. It never sees:

1. **`devDependencies`** — `depKinds` is `["dependencies", "peerDependencies"]`.
   Every `openapi-types`, `clsx` and `eslint-plugin-only-warn` above is a
   `devDependency`.
2. **`packages/types`** — it has its own `tsdown.config.ts` and does not use
   the shared preset.
3. **The workspaces with no tsdown build** — `packages/standard`,
   `apps/dashboard`, `apps/web`, `apps/waf-page`.

`check-unused-deps.ts` at the repository root covers all three. It resolves a
dependency by asking whether the workspace can reach it: an import, a
stylesheet `@import`, a config file naming it as a string, a `tsconfig.json`
`types` array, a script invoking its binary, or a required peer of something
reachable. It runs in CI as `pnpm check:deps`.

## The `ws` types that were not really there

`@types/ws` had to stay in `apps/api`. `@fastify/websocket`'s own types
declare `import * as WebSocket from 'ws'`, and `ws` ships no types of its own.
Removing `@types/ws` does not fail the typecheck — `skipLibCheck` swallows the
error and `socket` degrades to `any`:

```
// with @types/ws removed, this compiles with no error at all:
app.get("/x", { websocket: true }, (socket) => {
	const z: string = socket; // socket is `any`
});
```

The same is true of `@types/react-dom` in `apps/web`. A dependency audit that
only asks "is the name imported" would have deleted both, and the degradation
would have been invisible.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md) —
  the pattern this is an instance of: something promised a behaviour, and the
  environment could not tell whether the promise was kept.
- [Four workspaces outside the net](four-workspaces-outside-the-net.md) — the
  same four workspaces, invisible to the test, lint and typecheck gate.
- [Mandatory rules that nothing enforces](mandatory-rules-that-nothing-enforces.md)
  — a rule that is written but not switched on.
