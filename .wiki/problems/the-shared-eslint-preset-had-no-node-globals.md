# The shared ESLint preset had no Node globals

**Observed 2026-11-17**, while changing the tsdown preset.

The shared ESLint preset (`packages/standard/eslint/base.js`) sets no
`languageOptions.globals`. `no-undef` comes from `js.configs.recommended` and
stays switched on for plain JavaScript; `typescript-eslint` turns it off for
TypeScript. So the gap only opened for `.js` and `.mjs` files — and the
repository's JavaScript files are exactly the Node tooling.

`packages/standard/tsdown/tsdown.config.mjs` reads `process.env.NODE_ENV`,
`process.env.BUILDING`, `process.env.NEXT_PHASE` and `process.env.CI`. Linted,
it produced four `no-undef` errors.

## Why it was never noticed

The file was never linted.

- `packages/standard` has no `eslint.config.ts` of its own and no `lint`
  script, so `turbo run lint` never reached it.
- `packages/standard/eslint/base.js` — the preset itself — is also outside the
  lint net.
- The `.husky/pre-commit` hook runs `lint-staged`, which lints only the files
  staged in a commit. `tsdown.config.mjs` had not been staged since it was
  written.

The gap surfaced the moment that file was edited and committed: `lint-staged`
picked it up, and the build failed. The file had been wrong the whole time and
no gate could see it.

## The fix

The preset now declares the Node globals, and `packages/standard` declares
`globals` as a devDependency so the import resolves in the package that owns
the preset rather than by way of the root.

```javascript
languageOptions: {
	ecmaVersion: "latest",
	globals: {
		...globals.node,
	},
	// ...
}
```

The `turbo/no-undeclared-env-vars` warnings that came with it were also real:
`BUILDING`, `NEXT_PHASE` and `CI` are read by the preset to decide between
development exports and production bundles, and none of them was declared in
`turbo.json`'s `globalEnv`. They are now declared there.

## The shape of the problem

This is the same shape as [four workspaces outside the net](four-workspaces-outside-the-net.md)
and [mandatory rules that nothing enforces](mandatory-rules-that-nothing-enforces.md):
the repository's tooling files are the files that define the rules, and they
are the files the rules are not applied to. A preset that cannot lint itself
is a preset whose mistakes reach every consumer.

The tell is in the commit: `8febbd1` ("chore(tooling): update vitest config,
dependencies, and git hooks") changed `packages/standard/tsdown/tsdown.config.mjs`
and removed the `pre-push` hook in the same commit. With the hook gone, the
file was committed without ever being linted.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md) —
  the general shape behind all of this.
- [Four workspaces outside the net](four-workspaces-outside-the-net.md) —
  `packages/standard` is one of the five workspaces outside the net.
- [A duplicate JSON key silently replaced a types array](a-duplicate-json-key-silently-replaced-a-types-array.md)
  — found in the same session, in the same spirit: a file that no gate could
  read.
