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

### Landed — Wave 0 and Wave 1

Eight commits on `development`, unpushed:

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

### Landed — the environment, and the wiki

| Commit    | Subject                                                  |
| --------- | -------------------------------------------------------- |
| `b00b841` | docs(wiki): add the engineering wiki and a pre-push gate |

### Landed — Wave 2, the midtrans half

| Commit    | Subject                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `2025bcc` | feat(midtrans): classify every transaction status, not eight of twelve  |
| `3d2d97a` | refactor(midtrans): one error model instead of two that disagreed       |
| `8d1f181` | fix(midtrans): the signed amount is the module's fact, not the caller's |
| `b1c35e4` | fix(mtxx): keep the sync timeout default when the caller omits it       |

`b1c35e4` came out of the environment audit rather than the candidate list:
the same shape as the http-client retry bug — a default advertised, an
interface that permitted it to be destroyed, and a test that asserted the
default directly rather than the production path that breaks it. See
[interfaces that permit misuse](problems/interfaces-that-permit-misuse.md).

### In flight — Wave 2, the billing half

The domain InvoiceStatus union: stop one invoice-status column carrying three
merged vendor vocabularies. This is the item that can cost money — a
transient gateway read failure can currently write a vendor status into a
paid invoice and silently skip the subscription settlement. See
[the decision](decisions/invoice-status-vocabulary.md).

### Not started — Waves 3 and 4

C5b (close the axios escape hatches), C2 (the upstream-client module), C1
(one shared route module mounted by both apps), C6b (schema wire types and a
narrower admin barrel).

The environment backlog runs alongside the programme — see
[the environment backlog](backlogs/environment-backlog.md). Its first two
items, `collectCoverageFrom` and per-package coverage thresholds, are worth
starting before Wave 3: they make the untested parts of the codebase visible,
which changes what Wave 3 should prioritise.

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
