# Mandatory rules that nothing enforces

**Observed 2026-11-14**, by a pit-of-success audit.

AGENTS.md is loud about three things. Each is marked MANDATORY or CRITICAL.
Each is switched off in the shared ESLint preset.

## The rules and the switches

| AGENTS.md clause | The rule                                                                                  | The switch                                                                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §5.2             | "Zero `any` Policy" — `any` is strictly prohibited                                        | `packages/standard/eslint/base.js:84` — `"@typescript-eslint/no-explicit-any": "off"`                                                                                                                                                                      |
| §5.2             | "Never write a manual TypeScript interface for payload structures alongside a Zod schema" | `packages/standard/eslint/base.js:81` — `"@typescript-eslint/no-empty-object-type": ["off"]` — the exact rule that flags `interface X extends z.infer<...> {}`                                                                                             |
| §5.1             | "MANDATORY: All API response payloads ... MUST strictly use `snake_case`"                 | `packages/standard/eslint/base.js:34-42` — `camelcase` is configured with `properties: "never"`, so object-literal and schema property names are never checked; the `naming-convention` block covers only `interface`, `typeLike` and `variable` selectors |

## What that cost

**22 live `any` occurrences.** Worst: `packages/internal/http-client/src/errors/http-client-error.ts` (4), `packages/internal/http-client/src/types/executor.ts` (3, including `data: any`), `apps/web/components/ui/moving-border.tsx` (4).

The consequential ones are not the count — they are where `any` erases a
boundary:

- `packages/features/tiktok/src/tiktok/get-content.ts:15` — `fetcher<any>`, so
  the entire TikTok response is unchecked, and `data.data` is `any`.
- `packages/auth/mailer/src/renderer.ts:7` — `ReactElement<any>`.
- `packages/auth/billing/src/adapter/storage.ts:9`, `packages/auth/core/src/server/options.ts:12` (`process.env as any`), `packages/features/remini/src/client/task.ts:104` (`catch (err: any)`).

**17 instances of `interface X extends z.infer<...> {}`** — 6 in
`packages/features/mtxx`, 11 in `packages/features/elevenlabs`. All derive from
their schema, so they cannot drift in field names; the violation is
stylistic, but it is the banned pattern made the default style, and the one
rule that would have caught it was off.

**Live camelCase in request Zod schemas** — the §5.1 wording names request
schemas explicitly:

- `packages/auth/billing/src/schema/subscription.ts:14,24,59,69` —
  `userId` sitting next to `plan_id`, `period_start`, `subscription_id`.
- `packages/auth/billing/src/schema/api-plan.ts:37` — `seatBased`.
- `packages/auth/storage/src/plugin-server.ts:22-23` — `contentType`,
  `expiresIn`.

A camelCase key in an API body is a wire-format change, and the client and
server can disagree silently.

## Why this matters more than a normal lint debt

A rule that is switched off is not a slow rule. It is a rule that has
declared itself optional while the document that describes it says
MANDATORY. Anyone reading AGENTS.md reasonably believes these are checked.

The `no-explicit-any` comment in `base.js` says _"disable any rule that is
already covered by typescript"_. That is a defensible position for a rule
about redundant type annotations — but `any` is not redundant typing, it is
the erasure of a type, and it is exactly where upstream payload drift
becomes invisible.

## The fix

Turn the three switches back on, and scope the snake_case check to the
packages §5.1 names — `apps/api`, `apps/api-internal`, `packages/features/*`,
`packages/auth/*` — because React props in `apps/dashboard` and `apps/web` are
legitimately camelCase.

The `no-empty-object-type` switch is the one-line proof: it was disabled to
accommodate 17 violations, not because the rule was wrong.

## Related

- [The environment does not fail loudly](environment-does-not-fail-loudly.md)
- [Interfaces that permit misuse](interfaces-that-permit-misuse.md)
