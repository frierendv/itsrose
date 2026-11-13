# Working agreements

**Recorded 2026-11-14.**

## Decisions the user made

- **"All candidate is legit, I can't just pick one."** — Do not force a
  single choice; produce the ordering and let the work proceed. See
  [the programme](../programme.md).
- **The app split is deliberate.** `apps/api` and `apps/api-internal` both
  stay. Candidate C1 therefore becomes _one shared route module mounted
  twice_, with the auth guard, rate limit and audio→S3 upload expressed as
  per-app plugin options — not "delete one app".
- **`@itsrose/api-client` is deleted, not finished.** There was an option to
  generate it from the OpenAPI surface the server already produces at runtime;
  deletion was chosen instead.
- **Wiki location: `.wiki/` in the repo**, hidden but committed.
- **Pre-push hook: the full gate**, deliberately not a fast subset.
- **Dashboard component testing: decide after the environment audit lands**,
  so the testing strategy is coherent across packages rather than piecemeal.

## What the user has not decided

- Whether the coverage threshold should become per-package.
- Whether the retry policy should exclude non-idempotent methods by default.
- Whether `ClockPort` in billing should become a real seam (the usage package
  already has one to copy).

## What was asked of me

- Land the architecture programme as a sequence of gated commits rather than
  one large change.
- Keep the review's findings evidence-backed and its vocabulary consistent.
- Use subagents to keep the working context small, and communicate through
  pointers to files and commits rather than by restating content.

## Related

- [How work is delivered](delivery.md)

## Update, 2026-11-14: the pre-push hook was implemented

`.husky/pre-push` runs the full gate. `AGENTS.md` §5.5 item 4 documents it.
