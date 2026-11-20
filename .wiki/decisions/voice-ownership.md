# The voice ownership rules

**Decided 2026-11-20.** The brief is
[specs/feature-data-model.md](../specs/feature-data-model.md) at `67052cd`;
it carries the evidence and the rejected alternatives. Implemented by
`439d919` (route contract), `af9a989` (wiring, dashboard delete, account
cascade) and `010d7e3` (full-catalogue list), merged as `c3f1cd1`.

## The problem it settles

Every ElevenLabs voice — every user's clone included — lives in one platform
account behind one API key. `GET /v2/voices` with that key returns all of
them, so holding a `voice_id` is not a capability: every caller has the same
list. Ownership has to live on our side, on a row, before a voice surface can
be public.

## The decisions

1. **The ledger row grants ownership.** `provider_resources`
   (`resource_id`, `provider`, `provider_resource_id`, `tenant_id`, `user_id`,
   `kind`, `name`, `sample_asset_id`, `status`, `timestamps`) is the only
   source of truth. Upstream ids are not capabilities and keys are not
   ownership.
2. **A caller sees its clones plus the premade catalogue.** The public list
   filters the upstream catalogue to `owned ∪ category=premade`. Another
   user's clone is neither.
3. **Unattributed clones are quarantined, not deleted.** Clones created before
   this decision have no row, so they are invisible and unusable. Deleting
   biometric data on a guess is worse than hiding it; a re-claim path is a
   separate decision.
4. **Synthesis checks ownership before any upstream work.** Every `voice_id`
   (dialogue: every input) must be owned or premade. A denied id answers
   **404** with one generic message; 403 would confirm the voice exists.
5. **Clone creation records after the upstream create.** A failed ledger write
   fails the request (502) rather than returning a voice nothing owns.
6. **Deletion is upstream-first, then tombstone.** A failed upstream call
   leaves the row live so the delete is retryable. Account deletion applies
   the same rule per voice, logs every failure with user and voice id, and
   keeps rows as the retry manifest.
7. **The library is built from a cached, fully-paginated catalogue.** The
   upstream `page_size` defaults to 10, so filtering after one page would hide
   a user's own clones. The catalogue reads up to 10 pages of 100, caches for
   5 minutes per process, is invalidated when that instance records a clone,
   and the filtered library is returned whole (`has_more: false`,
   `total_count` of the filtered set). Caller pagination parameters are
   accepted and ignored.
8. **The internal API keeps pre-ownership behaviour** until its own auth guard
   is decided; it composes no ownership port. The SSRF guard applies there
   already.

## What it cost

- **Breaking for API clients**: the voice list shrank, arbitrary `voice_id`
  synthesis now answers 404, and pre-existing clones are unusable until
  re-claimed. This is deliberate; keeping the old surface would keep the
  privacy hole.
- **Per-process catalogue**: another instance sees a new clone within the
  5-minute TTL; the creating instance sees it immediately.
- **Query filters**: `category` and `voice_type` are accepted but ignored on
  the library path; only `search` and `sort` are applied.
- **Cap, not completeness**: more than 1000 upstream voices logs a warning
  and returns the partial catalogue.

## Evidence

- `packages/auth/resources` — ledger schema, registry adapter, voice service
  (record/list/remove/removeAllForUser), purge plugin.
- `packages/features/elevenlabs` — SSRF guard for caller-supplied media URLs,
  `deleteVoice`.
- `packages/api-routes/src/audio` — the ownership port and the four enforced
  routes; `apps/api` — catalogue, premade resolution, dashboard delete route,
  error mapping.
- Gate at `010d7e3`: 139 files / 1249 tests passed, 2 files / 5 tests skipped.
