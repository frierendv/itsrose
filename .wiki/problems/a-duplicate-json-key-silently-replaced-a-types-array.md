# A duplicate JSON key silently replaced a types array

**Observed 2026-11-17**, while auditing dependencies.

`apps/dashboard/tsconfig.json` had two `types` keys in the same
`compilerOptions` object:

```json
"types": ["node", "react", "react-dom", "vitest/globals"],
...
"types": ["vitest/globals"]
```

JSON parsers take the last occurrence of a duplicate key and discard the
earlier one. TypeScript's own JSON reader does the same, and it does not
report the collision. So the array that was actually in effect was
`["vitest/globals"]` — `"node"`, `"react"` and `"react-dom"` were silently
dropped.

The file still typechecked. Nothing failed, because `@types/node` and
`@types/react` were still reachable through the workspaces that import them
directly, so the globals they declare were in scope anyway. The array was
doing nothing.

## How it happened

Commit `da2be07` ("refactor(schemas): adopt eslint-plugin-zod and modernize zod
schemas", 2026-11-17) added the second `types` key. The commit was about
Zod schemas and ESLint rules; the tsconfig change was incidental, and nothing
in the diff flagged the collision.

## Why it is worth writing down

The failure is invisible in every way a gate can see:

- `tsc --noEmit` exits 0.
- `prettier --check` accepts the file — Prettier formats JSON without
  noticing a duplicate key.
- `eslint` does not parse JSON files for duplicate keys.
- The type array that survives is a _smaller_ one, so it looks deliberate.

The only way to see it is to read the file and count the keys, or to ask
TypeScript what it actually resolved:

```bash
cd apps/dashboard && npx tsc --noEmit --showConfig | grep -A 6 '"types"'
```

Before the fix, that printed only `vitest/globals`.

## The fix

The duplicate key was removed and the intended array kept. `node`, `react`
and `react-dom` are now in scope as intended, and the dashboard typecheck
still passes.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md) —
  the same shape: the file promised something, and nothing could tell whether
  the promise was kept.
- [Mandatory rules that nothing enforces](mandatory-rules-that-nothing-enforces.md)
  — a rule written in one place and switched off in another.
- [The shared ESLint preset had no Node globals](the-shared-eslint-preset-had-no-node-globals.md)
  — another file that was written outside the lint net.
