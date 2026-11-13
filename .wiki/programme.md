# The architecture deepening programme

On 2026-11-14 the repo was reviewed for architectural friction, on the
`development` branch of `frierendv/itsrose`, at `70ab174`. Seven candidates
were surfaced. The review report is at
`/tmp/architecture-review-20261113-173018.html` (ephemeral — regenerate from
the findings if it is gone).

The user declined to pick one candidate: _"All candidate is legit, I can't
just pick one."_ The programme below is the response — a wave order, because
the candidates are not seven independent decisions but one programme with
dependencies.

## Wave order and why

| Wave | Contents                                                                               | Depends on                                 |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------ |
| 0    | `GLOSSARY.md` — the domain vocabulary                                                  | nothing                                    |
| 1    | C5a retry, C7 deletions, C4 proration, C6a dashboard seam                              | Wave 0                                     |
| 2    | C3a adapter status union, then C3b midtrans status + errors + signature                | C3a depends on the midtrans classifier     |
| 3    | C5b close axios escape hatches, then C2 upstream-client module; C1 shared route module | C2 requires C5b                            |
| 4    | C6b dashboard schema types + narrow the admin barrel                                   | C3a (overlaps the dashboard billing slice) |

Wave 1 items are all corrections or removals — low risk, and they shrink the
codebase before the two large consolidations in Wave 3.

## Status as of 2026-11-14

Wave 0 and Wave 1 landed as eight commits on `development`, unpushed:

| Commit    | Subject                                                            |
| --------- | ------------------------------------------------------------------ |
| `d5d8a2f` | docs(glossary): name the billing, usage, and platform concepts     |
| `7e69f44` | fix(http-client): make the retry policy actually fire              |
| `dad0063` | chore(tooling): make the format and lint gate runnable             |
| `2786b2b` | chore(workspace): remove three packages with no callers            |
| `994dd4e` | fix(auth-billing): quote the proration the server charges          |
| `a798101` | fix(dashboard): stop the admin popovers from fetching on every row |
| `d7a5e3d` | fix(auth-usage): correct the usage invoice line description        |
| `a2f8486` | test(auth-billing): cover the invoice decision tables              |

Net 87 files, +1681 / −2517 lines.

## The candidate list

- **C1** — collapse the duplicated Fastify surface. 16 route files are shared
  between `apps/api` and `apps/api-internal`; 7 are byte-identical and 9 differ
  by 7–25 lines. The error→envelope mapper is copied line for line.
- **C2** — one upstream-client module at the seam between the six feature
  packages and their services. Three HTTP idioms, four error mappers, one
  response schema actually parsed.
- **C3** — one invoice-status vocabulary. See
  [the decision](decisions/invoice-status-vocabulary.md).
- **C4** — one proration rule. See [the decision](decisions/proration-single-rule.md).
- **C5** — repair `@itsrose/http-client`. See
  [the decision](decisions/http-retry-contract.md).
- **C6** — the dashboard's data seam takes a thunk; the schema owns the wire
  types.
- **C7** — three packages with no callers. See
  [the decision](decisions/deletion-test-applied.md).

## The sequencing principle

"Top recommendation" meant _highest value_, not _do first_. C5a was a two-hour
fix with a verified proof, and C7 deleted code — doing those before anything
else meant Wave 3 had less to carry.

See [preferences/delivery](preferences/delivery.md) for why the programme is
split this way.
