# The asset storage policy

**Decided 2026-11-19.** The brief is
[specs/asset-storage-policy.md](../../specs/asset-storage-policy.md) at
`0780e44`; it carries the evidence and the rejected alternatives.

## The decisions

1. A durable asset belongs to the **user**
   (`assets/users/{userId}/{kind}/{assetId}/{filename}`). The Tenant is not in
   the key; the registry row records it, so an organization model can attribute
   existing objects later.
2. If the Tenant becomes an organization, a member's upload belongs to the
   Owner.
3. Storage is an **entitlement**, not dedicated Plan columns: the plan carries
   typed entitlements (`storage_bytes`, `storage_assets`); `features: string[]`
   stays human-facing copy and is never parsed for limits.
4. Generated outputs can be **promoted into the library** — a copy into the
   durable root plus a registry row.
5. Every upload **passes through the API**. There is no presigned
   direct-to-R2 upload; the API enforces the multipart limit and checks the
   magic bytes.
6. On downgrade or cancellation, existing assets are **unchanged**. The cap is
   enforced on new writes only.

## The shape it selects

- **Two roots.** `assets/` is durable and carries no lifecycle rule; `t/` stays
  disposable under the 1-day rule. They must never overlap: an object in
  `assets/` deleted by a bucket rule would leave its bytes counted forever.
- **Three URL modes.** A durable user upload is read through a 900 s signed GET
  minted per read; API-generated output keeps its public URL; scratch stays
  internal. A list never contains a URL. This refines D5 in
  [the public route surface](public-route-surface.md); it does not replace the
  signed/public split.
- **The registry row is the source of truth** (`asset_id`, `user_id`,
  `tenant_id`, `kind`, `key`, `size_bytes`, `content_type`, `created_at`,
  `deleted_at`). Ownership is a property of the row, not of the key path.
- **One upload path.** The API receives the bytes, checks the content type from
  magic bytes against the multipart limit, writes the object and inserts the
  row.
- **Promotion, not regeneration.** A generated object is copied from
  `t/users/{userId}/generated/…` into `assets/` and registered; the ephemeral
  copy keeps expiring.
- **Deletion is row-first**: mark `deleted_at`, delete the object, compact the
  row, decrement bytes only after the object delete succeeds. Account deletion
  purges both roots and the rows.

## What this does not decide

- **Organizations.** No organization model exists, so the key is user-scoped.
  Decision 2 is recorded for the future, not implemented.
- **The voice library.** `GET /v1/audio/get_voices` lists the platform's
  ElevenLabs account, not our bucket; a per-user voice library needs an
  ownership mapping and is not solved by this policy. See the brief §2.
- **Per-plan retention.** A lifecycle rule is prefix-scoped, not plan-scoped. A
  differing retention window would need a registry `expires_at` and a sweeper,
  which this decision deliberately does not build.
- **Where the entitlement physically lives** — a JSON column on the plan or a
  separate table — is left to the implementation slice, provided code reads it
  and `features` is never parsed.

## Obligations this creates

- `@itsrose/auth-storage` gains the durable builders, a parser that accepts both
  roots (today `parseUserStorageKey` silently returns `null` for non-`t/` keys),
  the kind→policy table, and the registry.
- Account deletion stops swallowing durable-asset failures; ephemeral failures
  may stay best-effort.
- The dashboard never imports `@itsrose/s3`; asset endpoints are session-only
  and hidden from the public OpenAPI document (D4).
- The storage cap is synchronous; no background job is introduced.

## Amendments

- **2026-11-19 — promotion input.** Promotion copies a generated object
  identified by its storage key (`promote({ sourceKey })` in
  `packages/auth/storage/src/application/assets.ts`); the studio generation
  endpoint that surfaces that key to the dashboard is not built yet.
- **2026-11-19 — deletion order.** The shipped service
  (`packages/auth/storage/src/application/assets.ts`, `4880603`) deletes the
  object first and soft-deletes the row second, not the row-first order above.
  No sweeper exists yet, so a tombstone written before the object delete would
  free the bytes and leave an object nothing retries; object-first keeps a
  failed delete retryable and the row live until the bytes are gone. Account
  deletion now purges both roots and the rows too
  (`purgeUserDurableAssets` in `packages/auth/storage/src/purge.ts`): the
  `assets/users/{userId}/` object purge runs first, the one `deleteMany` on
  `asset_registry` runs only when that purge reports no errors, and an
  incomplete object purge keeps the rows as the retry manifest while the auth
  hook logs the failure at error level instead of swallowing it. Ephemeral
  failures stay best-effort.
