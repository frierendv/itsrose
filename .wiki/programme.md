# The architecture deepening programme

On 2026-11-14 the repo was reviewed for architectural friction, on the
`development` branch of `frierendv/itsrose`, at `70ab174`. Seven candidates
were surfaced. The review report is at [`architecture-review.html`](architecture-review.html),
kept here so it survives `/tmp`. Open it in a browser — it renders its own
diagrams.

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

### Landed — Wave 2, the billing half

The domain InvoiceStatus union: stop one invoice-status column carrying three
merged vendor vocabularies. This is the item that can cost money — a
transient gateway read failure can write a vendor status into a paid invoice
and silently skip the subscription settlement.

| Commit    | Subject                                                                                 |
| --------- | --------------------------------------------------------------------------------------- |
| `e6a38c8` | fix(auth-billing): spell the voided invoice status consistently                         |
| `7ff8fba` | fix(auth-billing): one invoice-status vocabulary, and one place that asks "is it paid?" |

See [the decision](decisions/invoice-status-vocabulary.md).

### Landed — Wave 3 and 4

| Commit    | Subject                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| `c2bb6de` | test(auth-usage): cover the Redis adapter that meters billable usage          |
| `f22d238` | refactor(dashboard): derive the admin wire types from the schemas             |
| `1403f08` | fix(billing): a zero price is a price, and the cron inputs carry their bounds |
| `4d292ed` | refactor(http-client): close the axios escape hatches                         |
| `6a6a28f` | refactor(api): one shared route surface, mounted by both apps                 |

**C5b — the axios escape hatches are closed.** `HttpClient` no longer exposes
`interceptors`, `defaults` or `axiosInstance`. The client has a surface for
what the four consumers actually needed: `requestTransform`,
`responseTransform`, `adapter`, `setDefaultHeader(s)` and `resolveUrl`.

The hook names are `requestTransform` and `responseTransform` rather than
`transformRequest` and `transformResponse` because **axios already owns those
two key names for its own data transformers** — `axios.create(config)` would
have handed our hook to axios to call with `(data, headers)`.

The hooks are registered **after** the retry interceptor on purpose. Axios
runs request interceptors in reverse registration order and response
interceptors in registration order, so the retry interceptor counts the
attempts and the hooks own the caller's payload. Moving them earlier would
let midtrans' business-status mapping preempt retries on a 5xx.

**C1 — one shared route surface.** `@itsrose/api-routes` holds the sixteen
routes and the error envelope; both apps mount it and pass their options. The
four difference axes are data. The per-route upload condition was NOT
unified, because it genuinely differs — `/music_compose` uploads unless the
caller asked for the inline payload, the three speech routes upload only
when a URL was asked for.

**C6b — the dashboard's wire types come from the schemas.** All eight
hand-declared interfaces are now derived, and the admin barrel exports nine
names instead of 124.

**The Redis usage adapter went from 0/5 functions to 100%.** 478 lines at
20% coverage, deciding what a customer is billed, with the legacy-merge rule
never verified. 45 tests; the adapter itself needed no change.

### In flight — the last programme item

C2 — the upstream-client module: one way to hold a client, one error shape,
and the response schema applied where one exists. The precondition (C5b) is
landed.

### Also done, found along the way

The `z.any()` residue. The `no-explicit-any` rule cannot see `z.any()` —
it is a runtime Zod call whose inferred type is `any` — so 22 of them
survived. A schema is the contract, and a field typed `z.any()` accepts
anything and disables the validation the schema exists to provide.

The environment backlog runs alongside the programme — see
[the environment backlog](backlogs/environment-backlog.md). Its first two
items, `collectCoverageFrom` and per-package coverage thresholds, are worth
starting before Wave 3: they make the untested parts of the codebase visible,
which changes what Wave 3 should prioritise.

## The candidate list

### C1 — collapse the duplicated Fastify surface

16 route files are shared between `apps/api` and `apps/api-internal`. Measured
on 2026-11-14: **7 are byte-identical** (`audio/get-models`, `audio/get-voices`,
`instagram/get-media`, `mtxx/image-restoration`, `mtxx/remove-bg`,
`remini/create-task`, `tiktok/get-content`) and **9 differ by 7–25 lines**.
The error→envelope mapper is copied line for line.

The differences reduce to exactly four axes, which is what makes the
collapse possible rather than a rewrite:

1. **OpenAPI description text.** `api` carries richer descriptions (markdown
   tables, example asset links); `api-internal` carries one-liners.
2. **The S3 audio upload.** `api` reads the `response-audio-format` request
   header and uploads the base64 audio to S3 when the format asks for a URL.
   `api-internal` returns the base64 inline. The condition differs per route
   — `audio/music.ts` uploads when the format is not `base64`, while
   `text-to-speech.ts` and `speech-to-speech.ts` upload when it is `url`.
3. **The response header schema.** `api` declares
   `headers: ElevenLabsSharedResponseAudioSchema` on the 200 response;
   `api-internal` does not.
4. **`consumes`.** `audio/create-ivc-voice.ts` declares
   `multipart/form-data` in `api` and `application/json` in `api-internal`.

`api` also has five routes `api-internal` does not (`auth`, the two
character_ai routes, `hooks`, `status`); `api-internal` has `mtxx/get-task.ts`
which `api` does not.

Both apps are kept. The difference between them becomes data, not duplicated
code.

### C2 — one upstream-client module

At the seam between the six feature packages and their services. Three HTTP
idioms, four error mappers, one response schema actually parsed. Depends on
C5b: the upstream-client module is only worth building once callers learn the
client instead of axios.

### C3 — one invoice-status vocabulary

See [the decision](decisions/invoice-status-vocabulary.md). **Landed.**

### C4 — one proration rule

See [the decision](decisions/proration-single-rule.md). **Landed.**

### C5 — repair `@itsrose/http-client`

See [the decision](decisions/http-retry-contract.md) for the retry contract.
**C5a landed.** C5b closes the axios escape hatches.

### C6 — the dashboard's data seam takes a thunk; the schema owns the wire types

**C6a landed** (`a798101`). C6b is the remaining half.

### C7 — three packages with no callers

See [the decision](decisions/deletion-test-applied.md). **Landed.**

## The measured facts behind C1, C5b and C6b

Recorded 2026-11-14 so the next agent does not have to re-derive them.

**The axios escape hatches.** `HttpClient` exposes `interceptors`, `defaults`
and `axiosInstance`. Four consumers:

| Consumer                                                | What it uses it for                                                                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/features/mtxx/src/client/client.ts`           | `extends HttpClient`; sets `defaults.headers.common["x-mtcc-client"]` after construction; installs a request interceptor that signs SDK requests and appends `api_key`/`api_secret` to openapi requests |
| `packages/features/remini/src/client/oracle.ts:79`      | `Object.assign(this.client.defaults.headers.common, headers)`                                                                                                                                           |
| `packages/midtrans/src/client/transport.ts:63,70`       | request and response interceptors                                                                                                                                                                       |
| `packages/midtrans/__tests__/unit/transport.test.ts:38` | `http.axiosInstance.defaults.adapter` — a test seam that exists by accident                                                                                                                             |

**The admin barrel.** `apps/dashboard/features/admin/index.ts` re-exports
**142 names** from 58 files. Its only outside consumers are nine app-router
pages, each importing exactly one page component. The feature's own files do
not import its own barrel. So 133 of the 142 exports exist for nobody.

**The dashboard's hand-declared wire types.** `features/admin/types.ts`
declares eight interfaces that shadow schemas already published at
`@itsrose/auth-billing/schema`. The drift is visible: `CreatePlanInput` is a
flat form shape (`price_amount`, `interval`) while `createPlanSchema` is a
nested wire shape (`prices: [...]`). The mutation translates between them —
that part is legitimate — but nothing forces the field names to agree.

**The usage Redis adapter.** `packages/auth/usage/src/adapter/redis.ts` is
478 lines at **0/5 functions** covered. It encodes the rules that decide what
a customer is billed, and nobody has verified them: the legacy-layout merge
(`Math.max` per day, with `requestsOk` clamped by `Math.min`), the window
clamp, the TTLs, and the pipeline stride of 5 with legacy keys versus 3
without. A wrong stride makes every read return the wrong numbers.

## The sequencing principle

"Top recommendation" meant _highest value_, not _do first_. C5a was a two-hour
fix with a verified proof, and C7 deleted code — doing those before anything
else meant Wave 3 had less to carry.

See [preferences/delivery](preferences/delivery.md) for why the programme is
split this way.
