# Feature data model

**A decision brief, not a decision.** Written 2026-11-20 on
`spec/feature-data-model`, branched from `development` at `024724c`. Every
claim below cites the file and line it is true at; where something is absent,
the absence was checked by search at that commit. The decision page is written
after the owner answers §7 — not from this draft.

**Blocks:** the first studio endpoint that returns something the user can find
again — the history view, the voice library, and every feature that produces
output.

**Reads with:** [the asset storage decision](../decisions/asset-storage-policy.md)
and [its brief](asset-storage-policy.md). That work decided where durable bytes
live and who owns them; this one decides what a produced thing is and what
owns the upstream resources a feature depends on.

## 1. The question

Before any studio feature ships, one thing has to be decided: **where does
per-feature user data live — the generated results a history view shows, and
the user-owned upstream resources such as cloned voices — and what owns them?**
A generated result has to answer "what produced this, with which inputs, when,
and is it still valid"; a cloned voice has to answer "whose is it" at all. The
asset library does not answer either question. It records a durable object's
owner, size and kind, but it has no column for the feature, the provider, the
inputs, a validity window, or the upstream object a result came from
(`packages/auth/storage/src/types.ts:136-154`,
`packages/auth/storage/src/schema/index.ts:27-78`). And the upstream resources
the features depend on have no ownership record on our side whatsoever: every
ElevenLabs voice — including every user's clone — lives in one platform account
behind one API key, and every caller of the public API can list and use it
(`packages/features/elevenlabs/src/elevenlabs/voices.ts:18-34`). Naming the
records, their links, and the lifetime of a result is the decision that has to
happen before the first studio route is written, because doing it afterwards
means backfilling rows for objects that no longer exist.

## 2. Current facts

### 2.1 Generated output is disposable, public, and unrecorded

- API-generated audio is written under `t/users/{userId}/generated/{filename}`.
  The public API injects a storage port whose only job is
  `uploadGeneratedFileUrl` (`apps/api/src/lib/audio-routes.ts:23-28`); that
  helper forces the `generated` category
  (`apps/api/src/plugins/app/03-s3.ts:124`, `:133-142`) and delegates to
  `uploadUserFileUrl`, which calls `storage.uploadUserFile` with that category
  and returns its **public** URL (`:85-115`).
- The key builder makes the shape explicit:
  `t/users/{userId}/{category}/{filename}` (`packages/auth/storage/src/keys.ts:128-159`,
  prefix at `:98-100`). `saveEphemeralFile` always resolves a public URL from
  the key (`packages/auth/storage/src/operations.ts:74-92`).
- The policy table says what that class is: public URL, one-day lifetime,
  never counted (`packages/auth/storage/src/policy.ts:50-51`, `:78-84`). The
  one-day rule is a comment about a bucket lifecycle rule, not code — there is
  no lifecycle configuration in the repository (the same finding the asset
  brief records at `asset-storage-policy.md:53-58`).
- Most generation output is **never stored at all**. `response-audio-format`
  defaults to `base64` (`packages/features/elevenlabs/src/zod-schema/shared/response.ts:20-28`).
  TTS, speech-to-speech and text-to-dialogue upload only when the caller sends
  `url` (`packages/api-routes/src/audio/upload.ts:27-28`;
  `packages/api-routes/src/audio/routes/text-to-speech.ts:44-50`,
  `speech-to-speech.ts:42-48`, `text-to-dialogue.ts:45-51`); music uploads
  unless the caller sends `base64`
  (`packages/api-routes/src/audio/upload.ts:19-20`,
  `packages/api-routes/src/audio/routes/music.ts:44-50`).
- **Nothing records a generation.** The only inserts into `asset_registry` are
  the upload and promotion paths
  (`packages/auth/storage/src/application/assets.ts:370-384`, `:439-453`).
  There is no `generations` table, no history endpoint, and no audit row
  anywhere in the tree (verified absent at `024724c`; the checked-in schemas
  cover Better Auth's own tables, `asset_registry`, tenancy/billing and usage
  only).
- **Promotion exists but nothing reaches it.** `POST /assets/promote` is a
  hidden, session-only route (`apps/api/src/routes/assets.ts:259-293`), and
  the dashboard asset client has no promote call
  (`apps/dashboard/features/assets/api.ts:112-171`) — so no studio route hands
  back a generated source key, and promotion is reachable only by hand. This is
  the gap the asset decision already records as an amendment
  (`decisions/asset-storage-policy.md:74-79`).
- The generated filename is a truncated SHA-256 of the bytes
  (`apps/api/src/plugins/app/03-s3.ts:56-59`), so it is not enumerable, but the
  URL is public and copying it is a read grant for a day. Nothing revokes it.

### 2.2 Cloning fetches caller-supplied URLs server-side

- `POST /v1/audio/create_clone_voice` is a public route
  (`packages/api-routes/src/audio/routes/create-ivc-voice.ts:10-33`) mounted at
  `/v1/audio` (`apps/api/src/lib/routes.ts:35`). Its handler passes
  `request.body` straight to the feature client (`:32`).
- The body is `audio_urls: z.array(z.url())`
  (`packages/features/elevenlabs/src/zod-schema/request/create-ivc-voice.ts:8`)
  — syntax-validated URLs, with no scheme, host, port or address restriction.
- The feature client fetches each URL server-side with a **credential-less**
  client and appends the bytes to the upstream form
  (`packages/features/elevenlabs/src/elevenlabs/create-ivc-voice.ts:10-23`).
  The asset client deliberately has no origin and no credentials so the
  platform key is never sent to an arbitrary host
  (`packages/features/elevenlabs/src/client/client.ts:49-57`); that protects
  the key, not the network.
- The **SSRF surface** is therefore: any authenticated caller — API key, or a
  dashboard session through the `x-auth-token` path
  (`apps/api/src/plugins/app/02-auth-guard.ts:207-232`) — can make `apps/api`
  issue a GET to any URL it can route to — loopback, private network,
  link-local metadata, internal services — and forward the response bytes to
  ElevenLabs as a voice sample. It is blind in the response body but not
  harmless: whatever internal audio the process can read becomes a cloned
  voice in the platform account, and the platform's key is not needed for it.
  Failed fetches are swallowed (`create-ivc-voice.ts:15-17`), so probing leaves
  little trace beyond the upstream attempt.
- No bound from this repository applies to the outbound fetch: the route's
  multipart limits — two files, 10 MB each
  (`packages/api-routes/src/audio/routes/create-ivc-voice.ts:24-31`) — govern
  the incoming request, not the download, and the client configures no
  timeout, no response-size cap and no redirect limit
  (`packages/features/elevenlabs/src/client/client.ts:55-57`; the transport
  passes its config straight to `axios.create`,
  `packages/internal/http-client/src/core/client.ts:39`).
- **Speech-to-speech has the same primitive, and it is not blind.**
  `speechToSpeech` accepts a URL string and fetches it with the same
  credential-less client (`packages/features/elevenlabs/src/elevenlabs/speech-to-speech.ts:13-28`)
  and returns the converted audio (`:56-92`); the route passes the caller's
  input through unchanged
  (`packages/api-routes/src/audio/routes/speech-to-speech.ts:38-50`). A caller
  can point it at any audio the API can read and receive a voice-converted
  copy of it.
- No route in the audio module requires an active subscription — no route
  anywhere sets `requireSubscription: true`, and the guard defaults it to
  false (`apps/api/src/plugins/app/02-auth-guard.ts:241-245`) — so these calls
  spend the platform's upstream credits for a lapsed account too, unless quota
  enforcement happens to be hard (default is soft,
  `packages/auth/usage/src/domain/units.ts:127-129`,
  `packages/auth/usage/src/plugin/options.ts:73-74`).
- The internal API mounts the same audio module with no auth guard at all
  (`apps/api-internal/src/lib/route-modules.ts:28-31`,
  `apps/api-internal/src/app.ts:66`; authless by design per
  [the public route surface](../decisions/public-route-surface.md), `:116-122`),
  so the clone and synthesis surfaces are unauthenticated on that deployment.

### 2.3 The voice library is the platform account's, not the caller's

- `GET /v1/audio/get_voices` is a public route
  (`packages/api-routes/src/audio/routes/get-voices.ts:10-27`), present in the
  public OpenAPI document
  (`apps/api/__tests__/__snapshots__/openapi-snapshot.test.ts.snap:2713`) and
  in the public route table (`apps/api/__tests__/route-table.test.ts:18`).
- It calls `/v2/voices` with the one configured platform key
  (`packages/features/elevenlabs/src/elevenlabs/voices.ts:18-25`,
  `client.ts:32-42`, `packages/features/elevenlabs/src/env.ts:7-9`). There is
  no per-user key and no per-user filter.
- Only `name` and `description` are redacted
  (`packages/features/elevenlabs/src/elevenlabs/voices.ts:27-32`). Every other
  field in the response schema passes through, including voice ids, labels,
  sample file names and sizes, `preview_url`, `sharing.whitelisted_emails`,
  and the social handles on a shared voice
  (`packages/features/elevenlabs/src/zod-schema/response/list-voices.ts:38-82`,
  `:306-309`, `:390-405`, `:435-541`).
- The request filters are category/type/search, not ownership
  (`packages/features/elevenlabs/src/zod-schema/request/list-voices.ts:42-59`).
  `is_owner` in the response is relative to the platform account
  (`response/list-voices.ts:505-508`), so it says nothing about our users.
- Consequence: **every caller of the public API sees every user's cloned
  voices**, including the voice ids needed to use them. There is no owner
  column to filter on, so there is nothing the route could filter by even if
  it wanted to.

### 2.4 Synthesis accepts any voice id — and music accepts none

- A correction to the premise: `music_compose` takes a prompt or a composition
  plan and no voice id at all
  (`packages/features/elevenlabs/src/zod-schema/request/music-compose.ts:17-128`);
  it inherits nothing from the voice library. The arbitrary-id claim is true
  for TTS, speech-to-speech and text-to-dialogue.
- `voice_id` is a plain string in all three request schemas
  (`request/text-to-speech.ts:19`, `request/speech-to-speech.ts:16`,
  `request/text-to-dialogue.ts:19-30`). The client puts it straight into the
  upstream path (`elevenlabs/text-to-speech.ts:25-37`,
  `speech-to-speech.ts:60-85`).
- The route handlers are thin passthroughs with no lookup between the request
  and the upstream call
  (`packages/api-routes/src/audio/routes/text-to-speech.ts:41-53`,
  `speech-to-speech.ts:38-51`, `text-to-dialogue.ts:43-54`). No code anywhere
  asks who owns a voice id before using it (verified absent at `024724c`).
- So any authenticated caller can synthesize with any voice in the shared
  account — another user's clone included — and there is no record of who used
  which voice.

### 2.5 There is no delete-voice operation and no ownership table

- The feature package exposes exactly the operations its index lists: models,
  voices, TTS, speech-to-speech, text-to-dialogue, IVC creation, music
  (`packages/features/elevenlabs/src/elevenlabs/index.ts:1-7`). There is no
  delete-voice, no get-one-voice, and no voice-update operation, and no
  history operation (verified absent at `024724c`).
- No schema in the repository stores a voice or an owner for one. The closest
  thing is `tenants.owner_user_id`
  (`packages/auth/billing/src/schema/tenancy.ts:15-36`), which maps a user to a
  tenant, not an upstream object to a user.
- Account deletion handles storage only: the Better Auth `after` hook purges
  `t/users/{userId}/` and `assets/users/{userId}/` and their rows
  (`packages/auth/storage/src/plugin-server.ts:144-170`;
  `packages/auth/storage/src/purge.ts:165-193`). It makes no upstream call, so
  **a user's cloned voices survive their account deletion** — a voice model
  derived from their biometric sample remains in the platform account.
- Voice creation has no per-user cap and no ownership write: each call adds a
  voice to the one shared account, so one caller can consume the account's
  voice slots and nothing attributes the result to them.

### 2.6 What the asset registry cannot express

The row is deliberately small — `asset_id`, `user_id`, `tenant_id`, `kind`,
`key`, `filename`, `size_bytes`, `content_type`, `status`, `created_at`,
`deleted_at` (`packages/auth/storage/src/types.ts:136-154`;
`packages/auth/storage/src/schema/index.ts:27-78`). It cannot express:

- **provenance** — no `feature`, `provider`, or provider task/response id;
- **inputs** — no prompt, text, parameters, or input asset ids;
- **validity** — no `expires_at`; `deleted_at` is a user delete, not an expiry;
- **a non-durable result** — every row is under `assets/`, and `status` is
  written as `ready` on both write paths
  (`packages/auth/storage/src/application/assets.ts:289-303`), so a row cannot
  represent a pending, failed or expired generation;
- **a link to the upstream object** — no provider resource column;
- **the generated source of a saved asset** — promotion validates the source
  key and then discards it; only the durable copy is recorded
  (`packages/auth/storage/src/application/assets.ts:387-453`);
- **an uncounted object** — `sumUsage` and the cap count durable rows only
  (`types.ts:204-211`,
  `packages/auth/storage/src/adapter/postgres.ts:194-212`), and
  `listForUser` lists durable rows only (`:171-181`), so one table cannot
  carry both a counted library item and a free one-day result without making
  every query lie.

## 3. The two records

Two tables, not one, because they answer different questions: **what did we
produce for this user** (`generations`) and **what upstream object belongs to
this user** (`provider_resources`). Both are user-scoped rows; neither is a
storage key.

### 3.1 `generations` (history)

| Column             | Shape          | Rule                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `generation_id`    | string, unique | Application id, chosen before the upstream call, so a failed call still has a row.                                                                                                                                                                                                                                                                                             |
| `tenant_id`        | string         | Stored beside `user_id` for the same reason `asset_registry` does it: the object is user-scoped, caps and analytics are tenant-wide (`packages/auth/storage/src/types.ts:136-154`).                                                                                                                                                                                            |
| `user_id`          | string         | The caller. The only ownership field any read checks.                                                                                                                                                                                                                                                                                                                          |
| `feature`          | string         | Closed enum owned by the studio package. V1: `text_to_speech`, `speech_to_speech`, `text_to_dialogue`, `music_compose`, `voice_clone`.                                                                                                                                                                                                                                         |
| `provider`         | string         | `elevenlabs` first; keeps the row portable to pixverse/remini later.                                                                                                                                                                                                                                                                                                           |
| `provider_task_id` | string, null   | Async providers only. No ElevenLabs audio operation in the client is asynchronous or returns a task id — each awaits the upstream response, and the IVC response carries only `voice_id` and `requires_verification` (`packages/features/elevenlabs/src/zod-schema/response/create-ivc-voice.ts:3-10`, `packages/features/elevenlabs/src/elevenlabs/text-to-speech.ts:22-44`). |
| `status`           | string         | Execution only: `pending`, `succeeded`, `failed`. **Not** `expired` — see §4 for why expiry is derived, not stored.                                                                                                                                                                                                                                                            |
| `input`            | JSON/string    | Sanitized inputs: text, prompt, parameters, input asset ids. Never audio bytes. Size-capped; a history row is not a backup.                                                                                                                                                                                                                                                    |
| `result_key`       | string, null   | Ephemeral object key under `t/users/{userId}/generated/`.                                                                                                                                                                                                                                                                                                                      |
| `result_asset_id`  | string, null   | Durable `asset_registry.asset_id`, set when the result is saved or promoted.                                                                                                                                                                                                                                                                                                   |
| `error_code`       | string, null   | Our mapped code, not an upstream message (upstream text can echo caller input).                                                                                                                                                                                                                                                                                                |
| `created_at`       | date           | Injected clock.                                                                                                                                                                                                                                                                                                                                                                |
| `expires_at`       | date           | `created_at` plus the generated class lifetime (`86_400` s, `packages/auth/storage/src/policy.ts:50-51`). Advisory: the bucket rule enforces it; nothing sweeps the row.                                                                                                                                                                                                       |
| `deleted_at`       | date, null     | Soft delete when the owner clears history.                                                                                                                                                                                                                                                                                                                                     |

Indexes: unique on `generation_id`; `(user_id, created_at)` for the list;
`(tenant_id, created_at)` for accounting; `(result_asset_id)` so an asset can
find its provenance; `(expires_at)` only if a sweeper is ever added.

Limitation to name now: one `result_asset_id` means one durable result per
generation. A future feature that returns several files needs a
`generation_artifacts` join table; not built here.

### 3.2 `provider_resources` (upstream-owned objects)

| Column                 | Shape          | Rule                                                                                                                                                               |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `resource_id`          | string, unique | Application identity; what the dashboard and studio routes address.                                                                                                |
| `provider`             | string         | `elevenlabs` first; part of the upstream uniqueness key.                                                                                                           |
| `provider_resource_id` | string         | The upstream id — `voice_id` for kind `voice`.                                                                                                                     |
| `tenant_id`            | string         | Same split as everywhere else.                                                                                                                                     |
| `user_id`              | string         | The owner. The only field enforcement reads.                                                                                                                       |
| `kind`                 | string         | Closed enum; `voice` is the first and only member in v1. A future kind (avatar, fine-tune) is added here before use.                                               |
| `name`                 | string         | The user-chosen display name as given to the provider.                                                                                                             |
| `sample_asset_id`      | string, null   | The durable asset the clone was made from. Nullable in the schema; required by the application for `voice`.                                                        |
| `status`               | string         | `pending_verification`, `ready`, `failed`, `deleted`. The create response already returns `requires_verification` (`zod-schema/response/create-ivc-voice.ts:7-9`). |
| `created_at`           | date           | Injected clock.                                                                                                                                                    |
| `deleted_at`           | date, null     | Soft delete after the upstream delete succeeds.                                                                                                                    |

Indexes: unique `(provider, provider_resource_id)` — the upstream id is unique
per account, and this is the lookup synthesis and deletion use; `(user_id,
kind)` for the library list; `(tenant_id)` for account-level queries.

### 3.3 Link rules, and why the row grants ownership

1. **One generation row per generation request.** It is written before the
   upstream call, so a timeout, a provider error or a crash leaves a `failed`
   row rather than a gap.
2. **`result_key` and `result_asset_id` are independent pointers.** A
   successful generation normally sets one; it sets **both** when the result
   was saved/promoted (the ephemeral copy keeps expiring, the durable copy does
   not), and **neither** when delivery was inline base64 and nothing was
   stored. The third state is legitimate and must render as "not stored",
   not as an error.
3. **A saved result does not delete its source.** Saving copies the generated
   object through the asset service
   (`packages/auth/storage/src/application/assets.ts:387-453`) and then sets
   `result_asset_id` on the existing history row. The generated key stays and
   expires on its own.
4. **A provider resource points at its sample.** `sample_asset_id` names the
   durable `voice_sample` the clone was created from. Deleting that asset is
   allowed — the asset row stays as a soft-deleted tombstone — so the provider
   row keeps a provenance pointer whose bytes are gone; reads must tolerate a
   deleted sample.
5. **Deletes never cascade across the two records.** Clearing a history row
   soft-deletes the row only: it does not delete the saved asset and does not
   touch upstream. Deleting a provider resource deletes upstream first and
   soft-deletes the row second, so a failed upstream call stays retryable.
   Deleting an asset does not delete a voice; it leaves the tombstone above.
6. **The row, not the key, grants ownership.** A key is a path: the lifecycle
   rule deletes the object without writing anything, so a surviving key is not
   evidence a user still owns a result. A generated URL is public
   (`policy.ts:78-84`), so holding it is not a permission. A `voice_id` is
   unique to the platform account, not to a user, and every caller of the
   shared key can use it (`voices.ts:18-34`), so it is not a capability
   either. Only a row can be scoped by `user_id`, survive the object it
   describes, and be the thing a deleted account purges. This is the same rule
   the asset decision already states for durable assets
   (`decisions/asset-storage-policy.md:36-38`;
   `packages/auth/storage/src/types.ts:130-135`).
7. **The two rows must agree on the user.** When linking a result asset or a
   sample asset, the service re-reads the asset row and rejects a
   `user_id`/`tenant_id` mismatch; the link is not trusted because the caller
   named an id.

**Why not reuse `asset_registry`.** A rows-per-table split is cheaper than
teaching one table two lifetimes. Mixing a free one-day result into
`asset_registry` would either make `listForUser` return non-library rows or
make `sumUsage` count bytes nobody promised to keep, and would still leave
provenance and upstream links unexpressed (§2.6). `generations` is a ledger,
not a library.

## 4. The history retention decision

The options, and what each costs. One of them has to be picked before the
history endpoint is written, because it decides whether `result_asset_id` is
normally null or normally set, and whether the dashboard's library and history
screens are the same thing.

| Option                          | What the user gets                                                                                                                                             | Cost                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — metadata only**           | A list of what was generated and with which inputs; the object keeps its 1-day life; the UI says "expired — regenerate".                                       | No replay, so "history" has no result in it. Regeneration costs another upstream call and is not guaranteed identical (a seed exists but the model may change). The prompt/input is still stored durably, which is the privacy-sensitive half without the useful half. Cheapest: no new lifecycle class, no counted bytes, no cap interaction.                                                                                                                                                                                                                                                                                                  |
| **B — auto-save every result**  | Full history; every result is a library asset and replays.                                                                                                     | Every retry and every spam call becomes counted durable bytes, so the storage cap turns into a generation cap. Promotion stops meaning "the user saved this" (asset decision 4). Promoted rows are forced to `application/octet-stream` because the object-store port returns bytes only (`packages/auth/storage/src/application/assets.ts:214-222`, `:430-450`), so the library loses real MIME. Large/video output is expensive to copy and store; the save can fail after the generation succeeded.                                                                                                                                          |
| **C — per-feature policy**      | The row always exists; small synchronous output auto-saves; large or asynchronous output requires an explicit save; unsaved results stay replayable for a day. | Two behaviours to explain, test and document; an async feature must give the user a save window before the 1-day expiry; auto-save can hit the cap and must degrade rather than fail.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **D — dedicated history class** | A 7/30-day history of the actual result, separate from the library.                                                                                            | Needs either a third lifecycle root (a bucket rule is prefix-scoped, so the window is global, not per plan) or a registry `expires_at` **plus a sweeper**. The repository has no sweeper; the only precedents are the billing cron endpoint (`packages/auth/billing/src/domain/cron.service.ts:8-14`, `packages/auth/billing/src/plugin/plugin-server.ts:72`) and an opt-in interval flush (`apps/api/src/plugins/tracking/usage-flush.ts:11-52`). Either way it is new background machinery, and it was explicitly deferred by the asset decision because a plan does not yet differ in retention (`decisions/asset-storage-policy.md:56-58`). |

**Recommend C.** The row is written for every studio generation; for a
synchronous feature the generated object is stored under the `generated` class
before the response is returned, while an asynchronous feature writes the row
at creation and stores the object when the task completes; and a per-feature
table in the studio package decides whether the result is also saved into the
library. V1 of the table: `text_to_speech`
auto-saves (short, synchronous, cheap); `speech_to_speech`, `text_to_dialogue`
and `music_compose` require an explicit save; a future asynchronous video
feature requires an explicit save. The discriminator is bytes, not intent — an
output above the auto-save ceiling follows the explicit path even if its
feature is on the auto-save list.

Under C the flows are:

1. **Generate.** Write the `pending` row, call the provider, store the
   returned bytes under `generated/`, set `result_key` and `status=succeeded`.
   On an upstream failure set `status=failed`, `error_code`, and no result.
2. **Auto-save.** If the feature is on the auto-save list, copy the generated
   object through the asset service with kind `audio` and set
   `result_asset_id`. The save is a separate step: if it fails, the generation
   still succeeds.
3. **Save on demand.** A history row with `result_key` and no
   `result_asset_id` is "available for a day"; the save button does the same
   copy and sets the link.
4. **Read.** The list returns rows, never URLs. Replay mints a 900 s signed URL
   for a saved asset (`SIGNED_READ_TTL_SECONDS`, `policy.ts:47-48`) or returns
   the generated public URL while it is live. "Expired" is derived:
   `result_asset_id is null and expires_at < now`. No sweeper is introduced,
   so a row's `status` never has to be rewritten by a background job.
5. **Clear.** Soft-delete the row. Saved assets are deleted from the library
   screen, not the history screen.

**What the plan entitlement does under C.** `storage_bytes` and
`storage_assets` count only auto-saved and explicitly saved results — durable
assets, exactly as the asset decision defines them
(`packages/auth/billing/src/types.ts:34-47`,
`packages/auth/storage/src/application/assets.ts:234-268`). History rows,
input text and the one-day generated object count nothing against storage.
`quota_requests` continues to meter the generation request itself, because
the usage tracker marks every route billable by default and the audio routes
do not opt out (`apps/api/src/plugins/tracking/request-tracker.ts:41-63`). The
save is a second write and can fail on the cap; when it does, the generation
still returns, the object stays ephemeral, `result_asset_id` stays null, and
the UI says the result expires in a day with an upgrade path. A free plan that
grants zero assets therefore gets one-day history, not a failed generation.

**Tradeoff accepted.** Two retention behaviours, a cap-dependent save path,
and a UI that has to show "saved", "available for a day" and "expired" as
three distinct states. In exchange, history contains real results for the
cheap features, the library stays a record of user intent, and no new
lifecycle root, sweeper or plan-scoped retention is built before a plan
actually differs.

## 5. Cloned-voice ownership

The security half of the question. The record is `provider_resources` (§3.2);
what follows is where it must be enforced.

### 5.1 The enforcement points

1. **Clone creation — from `asset_id`s, never URLs.** A session-only, hidden
   studio route (`POST /studio/voices`, in the style of
   `apps/api/src/routes/assets.ts:191-217`) takes a name and a
   `voice_sample` **asset id**. The service loads the asset row, asserts
   `user_id`, `kind` and `!deleted_at`, downloads the bytes through the
   object-store port, and calls a new feature operation that takes buffers.
   The URL-fetching path in `createIVCVoice` stays only for the legacy public
   route until that route is retired (§5.2), because the SSRF surface is the
   fetch itself (`create-ivc-voice.ts:10-23`). After the upstream create,
   insert the `provider_resources` row; if the insert fails, delete the
   upstream voice as compensation so no unowned voice is left in the shared
   account.
2. **Listing — the caller's clones plus premade voices, nothing else.**
   `GET /studio/voices` returns live `provider_resources` rows for the session
   user, merged with upstream voices filtered to `category=premade`
   (`zod-schema/request/list-voices.ts:54-59`), paginated with the upstream's
   `next_page_token`. The existing `getVoices` redaction stays for the premade
   side (`voices.ts:27-32`); the user's own names need no redaction because
   they are the user's own data. The public `get_voices` route cannot serve
   this list as it stands (§2.3).
3. **Synthesis — owner or premade.** Every studio synthesis route resolves
   each `voice_id` against `provider_resources` (`user_id`) or the premade
   set before calling the provider. Unknown ids get **404**, not 403, so the
   route does not become an existence oracle — the same reasoning the asset
   service uses for foreign assets
   (`packages/auth/storage/src/application/assets.ts:82-97`).
   Text-to-dialogue resolves every entry in `inputs[]`
   (`request/text-to-dialogue.ts:19-30`).
4. **Deletion — upstream first, row second.** `DELETE /studio/voices/:id`
   checks the row's owner, calls a new `deleteVoice` operation in the feature
   package (there is none today, §2.5), treats an upstream 404 as already
   gone, then soft-deletes the row. A failed upstream call leaves the row
   `ready` and the caller gets a retryable error; the row is the retry
   manifest, the same object-first pattern the durable purge already uses
   (`packages/auth/storage/src/purge.ts:69-131`).
5. **Account deletion — upstream voices too.** The auth `after` hook already
   purges both storage roots (`plugin-server.ts:144-170`). It gains a studio
   purge: list the user's live `provider_resources`, delete each upstream
   voice, then delete the rows. Upstream failures are logged at error and the
   rows are kept, mirroring the durable purge; the hook runs after the account
   is gone, so a failure has to be visible to an operator rather than thrown
   into a deleted session. The upstream deletion arrives as an injected port
   on the studio plugin — composed in `apps/api` — so `@itsrose/auth-studio`
   never imports the feature client.
6. **The public surface, or the fix is theatre.** If the ownership check only
   exists in dashboard routes, `GET /v1/audio/get_voices` and
   `POST /v1/audio/{text_to_speech,speech_to_speech,text_to_dialogue}` still
   expose and use every clone. `@itsrose/api-routes` cannot do the lookup —
   it is stateless by decision
   ([public route surface](../decisions/public-route-surface.md), `:56-72`) — so
   the choice is to keep those routes premade-only (a filter, no database
   read) or move them to the `apps/api` session/API-key surface with a
   service. Recommendation: public `/v1` keeps premade voices and premade-only
   synthesis; cloning and cloned-voice synthesis live in the dashboard studio;
   `/v1/audio/create_clone_voice` leaves the public table.

### 5.2 The public-API behaviour change, and whether it is breaking

Yes, breaking in `/v1`, in three ways:

- `GET /v1/audio/get_voices` shrinks from "every voice in the platform
  account" to "premade voices" for public callers. Both the result set and the
  pagination totals change; `apps/api/__tests__/__snapshots__/openapi-snapshot.test.ts.snap`
  and the published document must change with it.
- TTS/STS/TTD reject a `voice_id` that the caller does not own and that is not
  premade, with 404. Any consumer that stored a cloned voice id keeps hitting
  a rejection.
- `POST /v1/audio/create_clone_voice` is retired from the public surface. It
  cannot be made owner-safe in place: it has no authenticated user-to-voice
  link to check (`§2.5`), and the URL-fetch surface has to go (§2.2).

The reason it must break rather than be versioned away quietly: there is **no
owner mapping for existing voices**, so "preserve today's behaviour" means
"keep exposing every user's clones". The owner has to choose the migration
path for the voices already in the account (open question 2): grandfather them
as platform voices, delete them, or quarantine them until re-claimed. Each
path is a one-time operator action; none of them is a compatibility shim.

Versioning: the API version is a deployment constant
(`apps/api/src/lib/routes.ts:23`) and the route table is explicit, so a `/v2`
means a second mounted table, not a per-route flag. Keeping `/v1` and
documenting a security change is cheaper; it is the owner's call (question 3).

### 5.3 How the dashboard sees it

Two new feature slices, modelled on `apps/dashboard/features/assets/`:

- `features/voices/` — list (my voices + premade), clone dialog (upload a
  `voice_sample` through the existing asset upload, then `POST /studio/voices`
  with `sample_asset_ids`), voice detail (name, sample asset, created date),
  delete with confirmation. The client talks to the API origin with
  `credentials: "include"`, exactly as the asset client does
  (`apps/dashboard/features/assets/api.ts:18-24`, `:68-94`), so no Better Auth
  client plugin is needed.
- `features/history/` — list with a feature filter, replay for saved assets
  through the signed-URL mutation pattern the asset library already uses
  (`apps/dashboard/features/assets/hooks/use-assets.ts:76-87`), the
  "available for a day" state with a save action, and "expired — regenerate".
  Clearing history is a soft delete.

The asset library itself does not change. A promoted result appears there as
an `audio` asset because it is a durable asset; the history screen links to it
by `result_asset_id`, not the other way round.

## 6. Access and lifecycle matrix

| Thing                           | Owner                                              | Who may read                                                                                           | Who may delete                                                           | On account deletion                                                                                | Counts against storage                                                 |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Asset** (decided)             | The user, via the `asset_registry` row             | The owner, through a 900 s signed GET; nobody else                                                     | The owner; object removed, row tombstoned                                | Objects under `assets/users/{userId}/` purged, then the rows (`purge.ts:80-131`, `:165-193`)       | `size_bytes` and count, per tenant                                     |
| **Generation result — unsaved** | The user, via the `generations` row                | The owner through the history screen; **anyone holding the public URL** while the object lives (today) | The owner by clearing the row; the bucket by the 1-day rule              | Row deleted with the account; the object is removed by the lifecycle rule                          | Nothing: the `generated` class is uncounted (`policy.ts:78-84`)        |
| **Generation result — saved**   | The user, via `result_asset_id` → `asset_registry` | The owner, signed URL                                                                                  | The owner through the asset library; history row survives as a tombstone | Purged with the durable assets; the history row is deleted                                         | Same as asset                                                          |
| **Cloned voice**                | The user, via the `provider_resources` row         | The owner in the dashboard; **today every caller of the public API**, because there is no owner filter | The owner: upstream delete then row soft delete                          | Upstream voice deleted, then the row; a failed upstream delete keeps the row as the retry manifest | Nothing; the sample asset counts once, the voice is an upstream object |
| **Premade / platform voice**    | The operator (the shared upstream account)         | Every caller: it is the platform's catalogue                                                           | The operator, upstream only; no user-facing route                        | Unchanged — it was never the deleted user's                                                        | Nothing                                                                |

## 7. Open questions for the owner

| #   | Question                                                                                                                                                                                                           | Blocks?                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | Does history cover only dashboard studio generations, or every API-key generation on the public `/v1` surface too?                                                                                                 | **Yes** — it decides where the row is written and therefore the slice order. |
| 2   | The platform account already holds cloned voices with no owner record. At enforcement time: treat them as platform voices, delete them upstream, or quarantine them until re-claimed?                              | Yes, the voice slice                                                         |
| 3   | Is the public `/v1/audio/create_clone_voice` retired in favour of the dashboard studio, and does the public voice surface keep `/v1` with a documented security change or move to `/v2`?                           | No                                                                           |
| 4   | What counts as "premade" for the public list and synthesis: upstream `category=premade` in the platform account, or an explicit operator-maintained allowlist that may also include professional/community voices? | No                                                                           |
| 5   | Does the history row store the prompt/text itself, or only its length and a hash (privacy versus "what produced this")?                                                                                            | No                                                                           |
| 6   | On account deletion, does a failed upstream voice delete block the deletion, or is it logged and left to an operator retry?                                                                                        | No                                                                           |

Answering 1 is enough to start; 2 is enough to start the voice slice. Every
other question has a recommended default in this brief.

## 8. Proposed slices

Ordered, each independently reviewable, each leaving the tree green. No code
here; these are boundaries, not estimates.

1. **Records, schema and policy table.**
   A new `packages/auth/studio/` (`@itsrose/auth-studio`) with
   `src/schema/index.ts` (the two tables, modelled on
   `packages/auth/storage/src/schema/index.ts:27-92`), `src/types.ts` (record
   types and ports), `src/adapter/postgres.ts`, `src/application/generations.ts`
   and `src/application/provider-resources.ts`, and `src/policy.ts` (the
   feature → auto-save/delivery table and the closed enums). Register the
   schema-only plugin in `packages/auth/core/src/server/plugins.ts:128-134` so
   `pnpm --filter @itsrose/auth db:generate`
   (`packages/auth/core/package.json:38`) emits the DDL. Tests beside the
   package. No routes yet.

2. **Studio generation path and history read surface.**
   `apps/api/src/plugins/app/06-studio.ts` (the ports: records registry, asset
   service, entitlement reader, object store, ElevenLabs client);
   `apps/api/src/routes/studio/` for the hidden session routes
   (`POST /studio/generations` per feature, `GET /studio/generations`,
   `GET /studio/generations/:id/url`, `POST /studio/generations/:id/save`,
   `DELETE /studio/generations/:id`). Reuse `fastify.assetService.promote` for
   the save step and the generated class for the ephemeral object. Update the
   OpenAPI hidden-route handling and the tests in `apps/api/__tests__/`.

3. **Voice ownership — feature client, creation, listing, synthesis, deletion.**
   `packages/features/elevenlabs/src/elevenlabs/` gains a buffer-based clone
   operation and `deleteVoice`; `create-ivc-voice.ts` keeps the URL path only
   for the legacy route. `apps/api/src/routes/studio/voices.ts` for clone
   (asset ids), list (owned + premade), delete. The studio synthesis routes
   resolve voice ids against the rows. A `studioPlugin` with its own
   account-deletion `after` hook purges upstream voices through a port the
   host injects — `packages/auth/studio/src/plugin-server.ts`, composed from
   `apps/api/src/plugins/app/01-auth.ts` — so the auth package never imports
   `@itsrose/elevenlabs`. Tests beside both packages.

4. **Public surface restriction and the existing-voice migration.**
   `packages/api-routes/src/audio/routes/get-voices.ts`,
   `text-to-speech.ts`, `speech-to-speech.ts`, `text-to-dialogue.ts` and
   `create-ivc-voice.ts`: premade-only listing and synthesis, clone route
   removed. Update the explicit public route table
   (`apps/api/src/lib/routes.ts:34-46`), its test
   (`apps/api/__tests__/route-table.test.ts:15-25`), `apps/api-internal`'s
   table (`apps/api-internal/src/lib/route-modules.ts:28-31`) and the OpenAPI
   snapshot. One operator script or admin endpoint for the migration path
   chosen in question 2.

5. **Dashboard history and voice library.**
   New `apps/dashboard/features/voices/` and
   `apps/dashboard/features/history/` slices (api client, query keys, hooks,
   list pages, clone dialog, save/delete mutations, tests), modelled on
   `apps/dashboard/features/assets/`, plus the sidebar entries. The dashboard
   still never imports `@itsrose/s3`, `@itsrose/auth/server` or any Better Auth
   server entry (AGENTS.md §3.2).
