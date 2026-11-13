# The gate was red on the shared branch

**Observed 2026-11-14.** The single most expensive hour of the programme was
spent discovering this.

## What happened

Commit `8216c89` ("chore(tooling): configure lint-staged, prettier overrides,
and vscode formatters", 2026-11-13 10:29, by FrierenDv) changed one line of
the root `package.json`:

```
- "format:check": "prettier --check \"**/*.{ts,tsx,md}\" && syncpack lint",
+ "format:check": "prettier --check . && syncpack lint --dry-run",
```

Two independent breakages in one line:

1. **`--dry-run` does not exist in syncpack 15.x.** The command exits
   non-zero with "unexpected argument '--dry-run' found" — so the second half
   of the gate never ran.
2. **Widening prettier's glob to `.`** pulled in 13 YAML files under `docker/`
   and `.github/` that had never been prettier-formatted. `prettier --check`
   failed on all of them.

`8216c89` was pushed to `origin/development`. CI runs `pnpm format:check` on
every PR to `development` and every push to `main`, so **CI on the shared
branch went red and stayed red** until `dad0063` fixed it on 2026-11-14.

## Why nobody noticed

- The `pre-commit` hook runs `lint-staged`, which runs `eslint --fix` and
  `prettier --write` on _staged_ files. The author of `8216c89` had staged
  `.ts`/`.mjs`/`.md` files, which lint-staged formatted happily. The broken
  line was in `package.json` — never staged, never checked.
- There was **no `pre-push` hook**. The only hooks were `pre-commit` and
  `commit-msg`.
- The failure was discovered only when the architecture programme insisted on
  running the whole gate locally before each commit.

## The fix

`dad0063` restored `"format:check": "prettier --check . && syncpack lint"`
(`lint` is read-only; the `--dry-run` flag was always redundant), formatted
the 13 YAML files, and added the missing root `eslint.config.ts` — without
which the lint-staged hook could not lint any root-level TypeScript file at
all, because ESLint needs a config to start from.

Each YAML file was re-parsed and compared against its previous content to
confirm the reformatting was semantically identical.

## The general lesson

The gate existed and was correct in intent. It failed _open_ on the one thing
it was supposed to catch, and nothing connected "the gate is red" to "the
person who pushed". See
[the environment does not fail loudly](environment-does-not-fail-loudly.md).
