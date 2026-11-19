# Asset storage policy

**A decision brief, not a decision.** Written 2026-11-19 on
`refactor/v1-route-surface` at `80167cd`. Every claim below cites the file and
line it is true at. The decision page in `.wiki/` is written after the owner
answers §6 — not from this draft.

**Blocks:** the first studio endpoint — the voice library, user-uploaded voice
samples, image edits, video jobs.

## 0. Decisions taken (2026-11-19)

The owner answered §6. These answers override the options below where they
differ.

| #   | Decision                                                                                     | Consequence                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A durable asset belongs to the **user**: `assets/users/{userId}/{kind}/{assetId}/{filename}` | No organization layer is built. The registry row still stores `tenant_id` beside `user_id`, so a future organization model can attribute an asset without moving the object.                        |
| 2   | If the Tenant becomes an organization, a member's upload belongs to the **Owner**            | Recorded for the future; not implemented.                                                                                                                                                           |
| 3   | Storage is an **entitlement**, not dedicated Plan columns                                    | The plan carries typed entitlements (first keys: `storage_bytes`, `storage_assets`) resolved by an entitlement reader. `features: string[]` stays human-facing copy and is never parsed for limits. |
| 4   | Generated outputs can be **promoted into the library**                                       | A promotion copies a generated object into `assets/` and registers its row. The generated object stays ephemeral until promoted.                                                                    |
| 5   | Every upload **passes through the API**                                                      | No presigned direct-to-R2 upload. The API receives the bytes, checks size and magic bytes, writes the object and the row in one request. The presigned flow below is withdrawn.                     |
| 6   | On downgrade or cancellation, existing assets are **unchanged**                              | The cap is enforced on new writes only: no sweeper, no read-only mode, no deletion when a plan shrinks.                                                                                             |

## 1. The question

Before the first studio endpoint ships, five things have to be decided
together: where a durable object lives in the bucket, who may read it and for
how long, what expires it, what a Plan may charge for it, and what deleting it
— or the account — has to remove. The current namespace answers none of them.
Every key is rooted at `t/` (`packages/auth/storage/src/keys.ts:3`), and the
package states that deletion is delegated to a 1-day Cloudflare R2 lifecycle
rule (`keys.ts:94`, `keys.ts:114`, `operations.ts:72`, `operations.ts:152`,
`plugin-server.ts:36-37`). A cloned-voice sample or a library image that must
survive a month cannot live where a bucket rule deletes it in a day; a Quota
that counts requests cannot limit bytes (`packages/auth/billing/src/types.ts:39`);
and the only purge path is prefix-scoped to `t/users/{userId}/`
(`operations.ts:154-169`), so a second root would be invisible to account
deletion. Deciding these after the first endpoint ships means migrating live
keys.

## 2. Current facts

### Key layout, and what its shape assumes

- One root: `EPHEMERAL_ROOT = "t"` (`keys.ts:3`).
- Three shapes beneath it:
    - `t/users/{userId}/{category}/{filename}` (`keys.ts:117-148`), category
      sanitized to lower-case `[a-z0-9_-]+` (`keys.ts:48-61`), defaulting to
      `temp` (`keys.ts:137`);
    - `t/artifacts/{jobId}/{filename}` (`keys.ts:103-105`, `keys.ts:164-181`);
    - `t/{category}/{filename}` (`keys.ts:187-191`).
- The retention assumption is a comment, not code: `keys.ts:94` ("the 1-day
  retention root"), `keys.ts:114`, `operations.ts:72`, `operations.ts:152`,
  `plugin-server.ts:36-37`. No lifecycle configuration is checked in — there is
  no `wrangler*`, no Terraform, and `.github/workflows` holds only `ci.yml` and
  `midtrans-sandbox.yml`, so the rule lives on the bucket, outside version
  control. Verified absent 2026-11-19.
- `parseEphemeralKey` rejects any key not rooted at `t/`
  (`keys.ts:206-207`), while `parseUserStorageKey`'s docblock claims to handle
  `users/{userId}/…` as well (`keys.ts:253-255`). A durable root would parse as
  `null`, silently.
- The S3 client supports a global `keyPrefix` (`packages/internal/s3/src/types.ts:27-32`)
  but the storage config never sets one (`packages/auth/storage/src/config.ts:7-19`),
  so keys are bucket-root — a second root is a real sibling, not a subfolder
  trick.

### Presigned upload

- `createPresignedUpload` mints a PUT URL and returns it with a public URL
  (`operations.ts:113-134`); default TTL 900 s (`operations.ts:119`), while the
  client's own default is 3600 s (`packages/internal/s3/src/client.ts:24`).
- Only `ContentType` is bound into the signature
  (`client.ts:246-263`). No size, no checksum, no `ContentLength` range.
- The session endpoint accepts `category` (default `uploads`), `filename`,
  `content_type` and `expires_in` clamped to 60–86400 s
  (`plugin-server.ts:19-24`, `plugin-server.ts:48-77`). No size field, so a
  presigned PUT can write an unbounded object.
- Magic-byte detection exists but only on the server-side `upload()` path
  (`client.ts:113`, `packages/internal/s3/src/mime.ts:15-30`). Nothing inspects
  a presigned upload after the fact.

### Public vs signed URLs

- `saveEphemeralFile` always resolves a public URL and throws when
  `publicDomain` is unset (`operations.ts:34-40`, `operations.ts:86-92`).
- `getEphemeralFileUrl` defaults to public; it presigns only when
  `isPublic === false`, at 900 s (`operations.ts:97-108`).
- **Nothing in either application calls that signed path.** Outside its own
  tests (`packages/auth/storage/__tests__/operations.test.ts:83-110`), the only
  references are the type (`types.ts:63`) and the function itself.
- `listUserFiles` returns a `publicUrl` per row (`operations.ts:201`);
  `getUserFileUrl` is public-only (`operations.ts:351-369`).
- The two cache-control constants are both public caching
  (`config.ts:4-5`), so even the "mutable" default is a public CDN header.

### What the billing and usage packages already model

- The only quota field on a Plan is `quota_requests`
  (`packages/auth/billing/src/types.ts:39`), seeded 10 000 / 500 000 / 2 000 000
  / unlimited by Tier (`packages/auth/billing/src/domain/constants.ts:104`,
  `:125`, `:146`, `:168`).
- The Plan schema carries `features: string[]` and `quota_requests`, nothing
  about storage (`packages/auth/billing/src/schema/api-plan.ts:19-29`).
- Usage meters requests: endpoint, status class, latency, and a `billable` flag
  (`packages/auth/usage/src/types.ts:9-31`). Weights are per-endpoint units
  (`types.ts:173-181`), and the Quota snapshot counts requests
  (`types.ts:90-102`).
- Quota is enforced in a Fastify `preValidation` hook against a Redis counter,
  soft or hard (`apps/api/src/plugins/app/04-quota.ts:38-85`). No stored-bytes
  counter exists anywhere in the tree.
- The Tenant is derived from the user id — one personal Tenant per user
  (`packages/auth/usage/src/keys.ts:24-34`).

### Where API-generated assets land today

- Generated audio goes through the host port: the route module hands base64 to
  `AudioStoragePort` (`packages/api-routes/src/audio/upload.ts:44-60`,
  `packages/api-routes/src/options.ts:34-46`), implemented in the public API as
  `fastify.s3.uploadUserFileUrl` with no category
  (`apps/api/src/lib/audio-routes.ts:17-22`).
- That helper defaults the category to `temp` and returns the public URL
  (`apps/api/src/plugins/app/03-s3.ts:63`, `:68`, `:94-100`), so generated audio
  lands at `t/users/{userId}/temp/{sha256-truncated}` — the same prefix, and the
  same public-URL treatment, as any future user upload. The filename is a hash
  of the bytes (`03-s3.ts:42-45`).
- `uploadUserFile` silently returns the original payload when the request has no
  user (`03-s3.ts:53-55`); the URL variant throws instead (`:77-81`).

### What the dashboard can reach

- The session surface: `createBetterAuthClient` pointed at the API's `/auth`
  mount (`apps/dashboard/lib/auth/auth-client.ts:4-10`), TanStack Query over
  `withAuthQuery` (`apps/dashboard/lib/api/with-auth-query.ts:8-30`), route
  guard in Next middleware (`apps/dashboard/proxy.ts:39-57`).
- The typed client plugin list is billing and usage only — there is no storage
  client plugin (`packages/auth/core/src/react/plugins.ts:14-24`).
- The server side does mount the storage plugin: `storagePlugin()` is in the
  default Better Auth plugin list (`packages/auth/core/src/server/plugins.ts:128`),
  and `createBetterAuthServer` merges that list with the host's
  (`packages/auth/core/src/server/server.ts:11-14`, `:36`). So
  `/auth/storage/*` is live (`plugin-server.ts:48-140`) but untyped on the
  client.
- Dashboard feature slices today are `admin`, `billing`, `home`, `usage` — there
  is no assets or studio slice (`apps/dashboard/features/`).

### Two facts that strain D4 and D5

- **The voice library is already public, and is account-scoped upstream.**
  `get_voices` is a public `@itsrose/api-routes` route
  (`packages/api-routes/src/audio/routes/get-voices.ts:10-27`) mounted at
  `/v1/audio` (`apps/api/src/lib/routes.ts:35`), and it calls ElevenLabs
  `/v2/voices` with the single platform key
  (`packages/features/elevenlabs/src/elevenlabs/voices.ts:18-34`,
  `packages/features/elevenlabs/src/client/client.ts:32-42`). The request schema
  accepts an optional `category: "cloned"` filter
  (`packages/features/elevenlabs/src/zod-schema/request/list-voices.ts:55`), and
  the list is the platform account's — only names and descriptions are redacted
  (`packages/features/elevenlabs/src/elevenlabs/voices.ts:27-32`). D4 says the
  voice library is a dashboard-only studio
  (`public-route-surface.md:73-84`); no key layout makes it per-user, because
  the objects are not ours.
- **User uploads are already accepted, but never stored.** `create_clone_voice`
  takes `audio_urls` (`packages/features/elevenlabs/src/zod-schema/request/create-ivc-voice.ts:8`)
  and the feature package fetches each URL server-side and re-uploads the bytes
  (`packages/features/elevenlabs/src/elevenlabs/create-ivc-voice.ts:10-23`);
  the asset client carries no origin and no credentials
  (`client.ts:55-57`), so nothing constrains which URLs are fetched. D5 says
  user uploads are served through signed URLs, but the existing flow never
  stores the sample at all — it only proxies it, and it does so from arbitrary
  URLs.

## 3. Constraints

- **Studios are dashboard-only** (`public-route-surface.md:73-84`): served by
  `apps/api` on the session surface, hidden from the public document, never in
  `@itsrose/api-routes`, never in `apps/api-internal`.
- **`@itsrose/api-routes` stays stateless** — no identity, ownership, retention,
  file lifecycle, quotas, or background jobs (`public-route-surface.md:55-71`).
  `apps/api-internal` mounts the shared modules without a storage port
  (`apps/api-internal/src/lib/route-modules.ts:25-37`).
- **D5:** user-uploaded files are served through signed URLs; API-generated
  assets through public URLs (`public-route-surface.md:86-95`).
- **Hexagonal boundary:** domain code never imports an SDK (`AGENTS.md:201`);
  routes stay thin controllers (`AGENTS.md:215`). A storage policy that needs a
  service layer and ports therefore cannot live in a route module.
- **Bundle isolation:** the dashboard must never import `@itsrose/s3`,
  `@itsrose/auth/server`, or `@itsrose/auth-billing/server`
  (`AGENTS.md:255-260`). Presigning is server-only; the dashboard asks the API
  for a URL and never holds a credential.
- **`snake_case` in every API payload and schema** (`AGENTS.md:395`).
- **Permissions available today:** the single Better Auth `admin` role
  (`packages/auth/usage/src/domain/permissions.ts:12-18`) and the session
  middleware. There is no per-object permission model, so ownership must be a
  property of the key and the row, not a grant.
- **Deletion obligations already in code:** account deletion fires an
  `after` hook that purges `t/users/{userId}/` fire-and-forget, logging on
  failure (`plugin-server.ts:143-170`, `:157`), because
  `autoPurgeOnAccountDelete` defaults to on (`types.ts:120-124`). The purge is
  prefix-based and the object listing is paginated/batched at 1000 keys
  (`operations.ts:154-169`, `packages/internal/s3/src/client.ts:25`).
- **Vocabulary:** `GLOSSARY.md` has no word for a stored object — its Platform
  section names Delivery Format, Route Module and Route Prefix only
  (`GLOSSARY.md:158-188`). This brief says **asset**; the decision page should
  add it to the glossary rather than invent a synonym.

## 4. Options

Each axis: the recommendation first, then what the alternative costs.

### A. Key namespace for durable assets

**Recommend a sibling root, `assets/`, next to `t/`.** Durable keys become
`assets/users/{userId}/{kind}/{assetId}/{filename}`; the `{assetId}` segment is
a server-generated ULID, so a client filename can never collide with another
upload (today a presigned upload names its own file and a repeated PUT silently
overwrites — `plugin-server.ts:19-24`, `client.ts:246-263`).

The alternative — keeping durable objects under `t/` — costs the retention
mechanism: the 1-day rule that makes `t/` safe is prefix-scoped, so making it
spare one subtree means rewriting the bucket rule the ephemeral path depends on,
and the package's parsers would still treat durable keys as ephemeral
(`keys.ts:206-207`). A third option, a separate bucket, buys nothing at this
size and doubles the configuration surface.

**Migration:** there is nothing stored to migrate. Every builder roots at `t/`
(`keys.ts:96-191`), and the only write path in the tree is `saveEphemeralFile`
→ `s3.upload` (`operations.ts:74-92`), so no object exists outside it today. The
real migration risk is the parser: any code that classifies a key by its first
segment must accept both roots, or durable keys read as unknown
(`keys.ts:202-207`, `keys.ts:253-255`).

### B. Signed-URL TTL, and how the dashboard gets a fresh URL

**Recommend server-issued on read: a session endpoint mints a 900 s signed GET
per asset, and no list response ever contains a URL.** 900 s matches the one
TTL the package already names (`operations.ts:107`) and is long enough for a
page to render a grid of thumbnails and short enough that a revoked grant dies
within a quarter hour.

The alternative — presigning on upload and handing the dashboard a long-lived
URL — is what the plugin does today (`operations.ts:126-133`) and costs
revocability: a URL valid for a day outlives any ownership check made when it
was issued, and cannot be withdrawn. A middle option, public URLs plus an
unguessable key, is exactly what D5 forbids for user uploads
(`public-route-surface.md:88-89`) — and note the current code cannot express
that distinction, because every path returns a public URL
(`operations.ts:86-92`, `:126-133`, `:201`, `:351-369`).

One constraint on the TTL: an upstream that is given a URL must be able to fetch
it. The voice-clone flow fetches server-side inside the same request
(`create-ivc-voice.ts:10-23`), so 900 s is ample there — but any flow that hands
a signed URL to a third party for later fetch needs its own TTL decision.

### C. Retention and lifecycle

**Recommend three classes, and only one of them is durable:**

| Class                             | Prefix                                                    | Expires | Expired by                      |
| --------------------------------- | --------------------------------------------------------- | ------- | ------------------------------- |
| Kept library asset                | `assets/users/{userId}/{kind}/…`                          | never   | explicit delete, account delete |
| Scratch copy for a job            | `t/users/{userId}/upload/…`                               | 1 day   | R2 lifecycle rule               |
| API-generated output (D5: public) | `t/artifacts/{jobId}/…` or `t/users/{userId}/generated/…` | 1 day   | R2 lifecycle rule               |

Keeping generated output at one day is the cheapest thing that satisfies D5
(public URL, quotable immediately) without making the bucket a warehouse. If
the product needs a week, that is one more prefix rule, not new code.

**A per-Plan retention (say, 90 days for Pro) is the alternative, and it cannot
be done by a bucket rule as this repository understands one:** a lifecycle rule
is configured against a key prefix, not a Plan. That is a claim about Cloudflare
R2 which this repository cannot verify — no bucket configuration is checked in
(§2) — so a per-Tier window would need a registry column `expires_at` and a
sweeper. That is a background job, and §3 leaves `@itsrose/api-routes` unable to
own one; it would live in `apps/api` or the storage package. This brief does not
recommend it before a Plan actually differs in retention. Conversely, every rule
this policy does rely on is an operator action outside review.

### D. Quota accounting

**Recommend: keep generation on the existing request Quota, and add storage as a
separate cap enforced from a registry counter — bytes and count together.**
`quota_requests` already gates requests before the handler runs
(`apps/api/src/plugins/app/04-quota.ts:38-85`), and it should not be overloaded
to mean megabytes: one counter per period, one unit.

The storage cap is `count` assets and `bytes_stored` for the Tenant, checked
synchronously in the request that mints the upload, and maintained on add and
delete. That is enforceable with no background job. Its cost is drift: the
counter is only correct while every deletion goes through the API, which is why
the durable root must never carry a lifecycle rule — an object expired by a
bucket rule would leave its bytes counted forever.

The alternatives are worse in a way worth naming. **Count only** lets one
500 MB upload cost the same as a 20 KB sample. **Bytes only** lets a tenant with
ten thousand 1 KB files make every listing expensive. **Requests only** — today's
model — cannot see storage at all, so a "storage quota" would be a fiction.

The cap itself is an entitlement (§0.3): the plan carries typed entitlements —
the first keys are `storage_bytes` and `storage_assets` — resolved by an
entitlement reader. `features: string[]`
(`packages/auth/billing/src/schema/api-plan.ts:25`) remains human-facing copy and
is never parsed for limits.

### E. Deletion

**Recommend: the registry row is the source of truth, and deletion is
row-first, object-second.** Delete marks `deleted_at`, removes the object, then
the row is compacted; a failed object delete leaves a row the next sweep can
retry, which is strictly better than an orphan object nobody can find. Decrement
`bytes_stored` only after the object delete reports success.

**Account deletion** must purge both roots: the existing hook covers
`t/users/{userId}/` (`plugin-server.ts:157`), and a durable root needs its own
call or it survives the user. Note the hook is fire-and-forget and only logs a
failure (`:157-164`) — acceptable for ephemeral bytes, a data-retention problem
for a durable library. It should also purge registry rows, not just objects.

**R2 lifecycle interaction:** the two roots must never overlap. Any object under
a rule-covered prefix will disappear without the registry knowing, and any
object outside a rule-covered prefix will live until someone deletes it. The
current design's safety comes entirely from `t/` being disposable
(`keys.ts:94`) — that property is what a durable root gives up.

## 5. Recommendation

One default design, and the tradeoff it accepts.

### Key layout

```text
assets/users/{userId}/{kind}/{assetId}/{filename}   # durable; signed reads; counted
t/users/{userId}/upload/{assetId}                   # scratch for one job; 1 day; signed reads
t/users/{userId}/generated/{assetId}                # API-generated; 1 day; public URL (D5)
t/artifacts/{jobId}/{filename}                      # existing job artifacts; 1 day; public URL
```

Kind is a closed enum owned by the package (`voice_sample`, `image`,
`video_frame`, …) so the category segment stops being a free string that decides
policy by accident. The **category is the policy carrier**: it selects the root,
the URL mode, and whether bytes count. That is the seam the current code lacks —
`t/users/{userId}/temp/` today holds both a user upload and an API-generated
audio file (`03-s3.ts:63`, `apps/api/src/lib/audio-routes.ts:17-22`), and the
policy cannot tell them apart.

### Request flow

**Upload (API-mediated).** Every upload passes through the API; there is no
presigned direct-to-R2 path (§0.5).

1. Dashboard posts the bytes to a session endpoint with `kind`, `filename` and
   `content_type`.
2. The API checks the storage entitlement against the user's `bytes_stored` +
   `asset_count`, detects the MIME from magic bytes
   (`packages/internal/s3/src/mime.ts:15-30`), enforces the multipart limit
   (`packages/api-routes/src/audio/routes/create-ivc-voice.ts:24-31`), writes
   the object under `assets/`, and inserts the `ready` row — one request, no
   confirm step, no client-declared size to trust.

**Store.** Object at the key above; one row per asset with `asset_id`,
`tenant_id`, `user_id`, `kind`, `key`, `size_bytes`, `content_type`,
`created_at`, `deleted_at`. The row is what makes ownership checkable; the key
alone is not a permission (§3).

**Read.** The list endpoint returns rows only (`asset_id`, `kind`, `filename`,
`size_bytes`, `created_at`) — never a URL. A second endpoint mints a 900 s
signed GET for one `asset_id` after checking the row's owner. The dashboard
caches the row list in TanStack Query and refetches the URL when it expires.

**Consume.** A studio endpoint that needs bytes takes an `asset_id`, not a URL,
and resolves it server-side: the object is readable by the API, so a
voice-clone call can download it and hand the bytes upstream instead of fetching
a caller-supplied URL (`create-ivc-voice.ts:10-23`). This closes the arbitrary-URL
surface that D5 implicitly assumes away.

**Promote.** A generated output becomes durable by copying it from
`t/users/{userId}/generated/{assetId}` into the durable root and inserting a
row with its real `size_bytes` (§0.4). The ephemeral object keeps its 1-day
rule; the copy is what the library owns and what the cap counts.

### Tradeoff accepted

Three URL modes, a registry table, one signing call per read, and an upload
that costs the API a byte copy. In exchange: access is revocable within 900 s, the storage cap is
enforceable without a background job, account deletion can find every durable
byte, and the 1-day lifecycle rule keeps exactly one job — it can never delete
something the user was promised.

## 6. Open questions for the owner — answered 2026-11-19

Kept as the record of what was asked; the answers are in §0 and override the
options above where they conflict.

| #   | Question                                                                                                                                                                                        | Blocks? |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1   | Does a durable asset belong to the **user** (`assets/users/{userId}/…`) or to the **Tenant**, which today is one-per-user but is glossed as personal _or_ organization (`GLOSSARY.md:140-143`)? | **Yes** |
| 2   | If the Tenant becomes an organization, does a member's upload belong to the Owner, or is it shared read-only with the organization?                                                             | No      |
| 3   | Is storage a Plan field (a new column, `bytes` + `count`) or an Entitlement expressed in the existing `features: string[]` that no code reads?                                                  | No      |
| 4   | Do generated outputs ever get promoted into the library ("save this audio"), or is regeneration the only way to keep one?                                                                       | No      |
| 5   | May the dashboard upload directly to R2 (presigned PUT), or must every upload pass through the API for size and magic-byte checks?                                                              | No      |
| 6   | On downgrade or cancellation, what happens to durable assets already over the new cap — read-only, deleted after a grace period, or unchanged?                                                  | No      |

## 7. Proposed slices

Ordered; each is independently reviewable and leaves the tree green. No code
here, and no tickets — these are boundaries, not estimates.

1. **Namespace and policy table.**
   `packages/auth/storage/src/keys.ts` (durable builders, a parser that accepts
   both roots), a new `packages/auth/storage/src/policy.ts` (kind → root, URL
   mode, TTL class, counted-or-not), `operations.ts` (stop returning a public URL
   from writes; one read-URL entry point), `types.ts`. Tests beside the existing
   `packages/auth/storage/__tests__/`.

2. **Registry and the storage cap.**
   A new `packages/auth/storage/src/schema.ts` modelled on
   `packages/auth/usage/src/schema/index.ts:11-19`, registered through the
   existing plugin (`plugin-server.ts:172-209`); endpoints for upload, list,
   read-URL and delete; the cap check. The cap is an entitlement (§0.3):
   `packages/auth/billing` gains the typed entitlement and its reader in the
   same change set (`AGENTS.md:478-482` on atomic edits).

3. **Split generated from uploaded, and add promotion.**
   `apps/api/src/plugins/app/03-s3.ts` (return a key and a policy, not a bare
   URL; take `kind`), `apps/api/src/lib/audio-routes.ts` (write to `generated`,
   hand back the public URL the policy allows), and the promote operation that
   copies a generated object into `assets/` and inserts its row (§0.4). Extend
   `apps/api/__tests__/s3-plugin.test.ts`. This is the slice that makes D5 true
   rather than aspirational.

4. **Deletion.**
   `packages/auth/storage/src/operations.ts` (purge both roots), the account
   hook in `plugin-server.ts:143-170` (purge objects **and** rows; stop
   swallowing the failure for durable keys), and — if asset deletion is a
   Fastify route rather than a Better Auth endpoint — `apps/api/src/routes/`.

5. **Dashboard seam.**
   `packages/auth/core/src/react/plugins.ts` (add the storage client plugin;
   today the list is billing and usage only, `:14-24`), a new
   `apps/dashboard/features/assets/` slice (query keys, hooks over
   `withAuthQuery`, list page, upload dialog), `apps/dashboard/constants/sidebar.ts`,
   and the prefetch helper in `apps/dashboard/lib/api/prefetch.ts` if the library
   page is server-prefetched. The dashboard never imports `@itsrose/s3`
   (`AGENTS.md:255-260`).
