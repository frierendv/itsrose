# Route surface v2 — corrected implementation plan

**Date:** 2026-11-19
**Base:** `development` @ `60f6dbc`
**Supersedes:** `plan-api-routes-refactor.md` (attachment, `sha256:b702ba79`) where §7 says so. The rest of it is adopted.
**Decision record:** [.wiki/decisions/public-route-surface.md](.wiki/decisions/public-route-surface.md)

**Status 2026-11-19:** C1, C3 and C4 are implemented in the working tree (see §4). C2 — the only breaking commit — is pending; the three others change no URL.

---

## 1. Decisions this plan implements

| #   | Decision                                                                                                | Consequence                                                                        |
| --- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D1  | Public path shape is `/{version}/{module}/{route}` — `/v1/audio/text_to_speech`                         | The `routes/v1` folder stops deciding URLs; an explicit table + `API_VERSION` does |
| D2  | Route documentation lives in the route definitions                                                      | `descriptions` / `consumes` options are deleted after the lost content is restored |
| D3  | `@itsrose/api-routes` is a stateless passthrough package                                                | no DB, auth, storage policy, jobs or studio routes                                 |
| D4  | Studios are dashboard-only                                                                              | never in `api-routes`, never in `api-internal`, hidden from public Scalar          |
| D5  | User uploads → signed URLs; API-generated assets → public URLs                                          | storage policy, tracked outside this plan                                          |
| D6  | `api-internal` keeps no ItsRose auth; JojApi owns commercial policy; a basic endpoint guard is deferred | no change in this plan                                                             |

---

## 2. What the original plan got wrong about URLs

The plan's item 4 is right that routes should use native `{ prefix }`, but it never states the resulting URL. Verified against the installed `@fastify/autoload@6.5.1`:

- Autoload **prepends** `autoConfig.prefix` to the folder name: `'/audio'` + `'/v1'` → `'/audio/v1'` (`handlePrefixConfig` does `pluginOptions.prefix = (pluginOptions.prefix || "") + prefix`).
- So `apps/api` serves `/audio/v1/text_to_speech` today, not `/audio/text_to_speech`.
- `.wiki/subsystems/api-routes.md`, `packages/api-routes/README.md` and the package's own route tables all say `/audio/*`, because they register the modules directly and never assert the app's table.

`15eaa26` (2026-11-17) caused this by moving the modules under `routes/v1/`. The same commit dropped the public API's OpenAPI `descriptions` and `consumes` overrides (`text_to_dialogue` sample links, four mtxx example tables, `create_clone_voice` → `multipart/form-data`).

Two consequences for the plan:

1. **The URL fix and the prefix refactor are one change.** The package currently builds its own URLs (`joinUrl(options.prefix, path)`) and is `fp`-wrapped, so a register-time prefix is dropped and `/v1/audio` cannot be expressed. Native prefixes must land first.
2. **The app needs a route table a test can assert.** A probed fact: `@fastify/autoload` cannot import TypeScript files under vitest (it dynamic-imports them through Node, not Vite), so the autoload-based URL shape is untestable in `pnpm test`. Folder-derived URLs are therefore replaced by an explicit table (see 3.3).

---

## 3. Target state

### 3.1 Public API (`apps/api`) — 25 routes

| Module         | Routes                                                                                                                                                                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `audio`        | `POST /v1/audio/create_clone_voice`, `GET /v1/audio/get_models`, `GET /v1/audio/get_voices`, `POST /v1/audio/music_compose`, `POST /v1/audio/music_compose_plan`, `POST /v1/audio/speech_to_speech`, `POST /v1/audio/text_to_dialogue`, `POST /v1/audio/text_to_speech`, `POST /v1/audio/text_to_speech/with_timestamp` |
| `character_ai` | `GET /v1/character_ai/search_character`, `POST /v1/character_ai/send_message`, `GET /v1/character_ai/character_info`                                                                                                                                                                                                    |
| `instagram`    | `GET /v1/instagram/get_media`                                                                                                                                                                                                                                                                                           |
| `mtxx`         | `POST /v1/mtxx/clothes_segmentation`, `expression_generation`, `image_restoration`, `outpainting`, `remove_bg`, `versatile_hairstyle`; `GET /v1/mtxx/get_task`                                                                                                                                                          |
| `pixverse`     | `POST /v1/pixverse/text_to_video`, `image_to_video`; `GET /v1/pixverse/get_task`                                                                                                                                                                                                                                        |
| `remini`       | `POST /v1/remini/create_task`                                                                                                                                                                                                                                                                                           |
| `tiktok`       | `GET /v1/tiktok/get_content`                                                                                                                                                                                                                                                                                            |

`/auth/*`, `/hooks`, `/status` stay unversioned: `/auth/*` is the Better Auth base path, and the other two are operational endpoints.

### 3.2 Internal API (`apps/api-internal`) — 19 routes, unversioned

`/audio/*` (9), `/instagram/get_media`, `/mtxx/*` (7), `/remini/create_task`, `/tiktok/get_content`. Unchanged from today; the divergence from the public paths is intentional (JojApi's facade decides its own paths, D6).

### 3.3 Wiring: an explicit table, not folder-derived autoload

Rationale: the accident was a wiring bug that no test could see; an explicit table is greppable, makes exposure deliberate, and is assertable in `pnpm test` without a build.

`apps/api/src/lib/routes.ts`:

```ts
import { AUDIO_ROUTE_PREFIX } from "@itsrose/api-routes/audio";
import { CHARACTER_AI_ROUTE_PREFIX } from "@itsrose/api-routes/character-ai";
import { INSTAGRAM_ROUTE_PREFIX } from "@itsrose/api-routes/instagram";
import { MTXX_ROUTE_PREFIX } from "@itsrose/api-routes/mtxx";
import { PIXVERSE_ROUTE_PREFIX } from "@itsrose/api-routes/pixverse";
import { REMINI_ROUTE_PREFIX } from "@itsrose/api-routes/remini";
import { TIKTOK_ROUTE_PREFIX } from "@itsrose/api-routes/tiktok";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { audioRoutesPlugin } from "./audio-routes";

/** The version of the public REST surface. Part of the public URL. */
export const API_VERSION = "/v1";

const versionedRoutes: FastifyPluginAsync = async (fastify) => {
	await fastify.register(audioRoutesPlugin, { prefix: AUDIO_ROUTE_PREFIX });
	await fastify.register(characterAiRoutes, {
		prefix: CHARACTER_AI_ROUTE_PREFIX,
	});
	// ...one line per module
};

export const registerVersionedRoutes = async (
	fastify: FastifyInstance
): Promise<void> => {
	await fastify.register(versionedRoutes, { prefix: API_VERSION });
};
```

`apps/api/src/lib/audio-routes.ts` — the only route that needs the host's storage:

```ts
import { audioRoutes } from "@itsrose/api-routes/audio";
import type { FastifyPluginAsync } from "fastify";

export const audioRoutesPlugin: FastifyPluginAsync = async (fastify) => {
	await fastify.register(audioRoutes, {
		declareAudioResponseHeader: true,
		audioStorage: {
			uploadBase64Audio: async (request, base64Audio) => {
				const result = await fastify.s3.uploadUserFile(
					request,
					base64Audio,
					{
						preprocess: (data) => Buffer.from(data, "base64"),
					}
				);
				return typeof result === "string" ? result : base64Audio;
			},
		},
	});
};
```

`apps/api/src/app.ts` calls `await registerVersionedRoutes(fastify)` after the plugin autoloads; `apps/api/src/routes/v1/` is deleted. `@fastify/autoload` keeps loading `routes/{auth,hooks,status}.ts` only.

`apps/api-internal/src/lib/route-modules.ts` becomes plain `fastify.register(plugin, { prefix })` — no helper, no option objects beyond audio's `declareAudioResponseHeader: false`.

**Alternative if you want to keep autoload** (not recommended): `appendAutoPrefix: true` on the routes autoload and `export const autoPrefix = AUDIO_ROUTE_PREFIX` in each file — verified to produce `/v1/audio/*`. Cost: the production route table then has no test in `pnpm test`, only a built-artifact smoke test.

### 3.4 Package contract after the change

- `export const xyzRoutes: FastifyPluginAsync` — plain plugins, relative URLs, no `fp`.
- `src/prefix.ts`, `src/compose.ts` deleted. `claimRoutePrefix` goes with them: Fastify's own duplicate-route error covers the collision that matters.
- `src/schema.ts` stays: `withAudioResponseHeader` is used by four audio routes and `declareAudioResponseHeader` is a real per-app difference (public declares the header, internal does not).
- `AudioStoragePort` stays, becomes optional:

```ts
export interface AudioStoragePort {
	/** Stores base64 audio and returns the URL it can be fetched from. */
	uploadBase64Audio(
		request: FastifyRequest,
		base64Audio: string
	): Promise<string>;
}

export type AudioRoutesOptions = {
	declareAudioResponseHeader: boolean;
	/** Omitted: the routes return the payload inline (internal API, tests). */
	audioStorage?: AudioStoragePort;
};
```

- `ROUTE_MODULE_PREFIXES` stays; it is the module namespace the table mounts under and the prefix the internal app registers with.
- The barrel exports `ROUTE_MODULE_PREFIXES`, `RouteModuleName`, `apiErrorHandler` + types, `AudioStoragePort`. Nothing else.

---

## 4. Commits

**Ship order:** C1, C3 and C4 are non-breaking and can land first. C2 is the only breaking commit and lands last, after JojApi confirms no consumer depends on the accidental `/audio/v1/*` paths.

### C1 — route documentation back into the routes (implemented, no URL change)

Restore what `15eaa26` dropped, from `git show 15eaa26^:apps/api/src/lib/route-modules.ts`:

| File                                       | Content to restore                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/audio/routes/text-to-dialogue.ts`     | The two example output links (`text_to_dialogue-output.wav`, `…-output-ID.wav`) |
| `src/audio/routes/create-ivc-voice.ts`     | Default `consumes: ["multipart/form-data"]`                                     |
| `src/mtxx/routes/clothes-segmentation.ts`  | Markdown example table                                                          |
| `src/mtxx/routes/expression-generation.ts` | Markdown example table                                                          |
| `src/mtxx/routes/outpainting.ts`           | Markdown example table                                                          |
| `src/mtxx/routes/versatile-hairstyle.ts`   | Example table + `versatileHairstyleCreateDescription()` from `@itsrose/mtxx`    |

Keep the `options.descriptions?.[key] ?? DESCRIPTION` read for now (the apps pass no overrides, so the inline text takes effect); this keeps the commit small and the existing override tests green.

Tests:

- `route-modules.test.ts`: assert `schema.description` of `/audio/text_to_dialogue` contains `text_to_dialogue-output.wav`; `/mtxx/clothes_segmentation` contains `Segmentation Mask`; `versatile_hairstyle` contains the hair-type table; `schema.consumes` of `/audio/create_clone_voice` is `["multipart/form-data"]`.
- New `apps/api/__tests__/openapi.test.ts`: Fastify + `@fastify/swagger` + zod compilers, register the modules, assert the generated document has `requestBody.content["multipart/form-data"]` for `create_clone_voice` and the restored descriptions. (Verified 2026-11-19: `fastify-zod-openapi` honours `consumes`; `@fastify/swagger` alone does not.)

### C2 — native prefixes, `/v1/<module>`, explicit table (pending, breaking once)

Package: delete `prefix.ts`, `compose.ts`; drop `RouteModuleOptions`/`descriptions`/`consumes`; every module becomes a plain `FastifyPluginAsync` with relative URLs; audio keeps `(fastify, options)`.

App: delete `apps/api/src/routes/v1/`; add `lib/routes.ts` + `lib/audio-routes.ts`; wire `app.ts`; simplify `apps/api-internal/src/lib/route-modules.ts`.

Tests:

- `route-modules.test.ts` → register each module with `{ prefix: MODULE_PREFIX }`; same route tables as today (minus `/v1`, which is the app's).
- `route-handlers.test.ts`, `audio-routes.test.ts`, `barrel.test.ts`: update registration/injection paths; delete `prefix.test.ts`.
- New `apps/api/__tests__/route-table.test.ts`: call `registerVersionedRoutes` on a bare Fastify and assert the full `/v1/...` table from 3.1, and that **no** route starts with `/audio/v1`. This test fails against `development` today — which is the point.
- `apps/api/__tests__/setup-env.ts` (or an inline env setup in the two new tests): the feature clients read credentials at import.

Docs: update `packages/api-routes/README.md` and record the change in the wiki (§5).

### C3 — audio storage seam (implemented)

`apps/api/src/plugins/app/03-s3.ts` gains `uploadUserFileUrl(...): Promise<string>` (throws when there is no user or no public URL) instead of relying on the `TData | string` union. `lib/audio-routes.ts` uses it; the silent-base64 fallback disappears from the public app. `audio-upload.test.ts` covers: no port → inline; port → URL; port throws → the error propagates.

### C4 — polling is free, not unlimited (decided 2026-11-19)

The constraint: polling is inherent to async generation, so charging it against the monthly quota punishes users for the shape of the product; but leaving it unthrottled is unbounded Redis + upstream work.

Resolution — split the two meters:

- **Quota:** `GET /{mtxx,pixverse}/get_task` declares `config: { billable: false }`. The tracker passes the flag through, and `@itsrose/auth-usage` gates the billable counters (month quota, `requests_ok`, billable endpoint and per-key counters) on it. Polls still count as traffic in the analytics buckets (`requests`, latency, endpoint totals), so usage dashboards stay truthful.
- **Rate limit:** the same routes keep a bounded budget — `config: { rateLimit: { max: 600, timeWindow: 60_000 } }` — instead of `rateLimit: false`. One key cannot turn polling into an upstream flood.

Both values are asserted in `packages/api-routes/__tests__/route-modules.test.ts`; the counter behaviour is asserted in `packages/auth/usage/__tests__/redis-usage-counter.test.ts`.

---

## 5. Verification gate

```bash
pnpm format:check
pnpm lint
pnpm build
pnpm typecheck
pnpm check:deps
pnpm test
```

Plus, per commit:

- C1: `pnpm vitest run --project packages/api-routes --project apps/api`
- C2: same, and confirm the new route-table test fails on the parent commit before it passes on the commit.
- C3: `pnpm vitest run --project packages/api-routes --project apps/api`
- C4: same.

---

## 6. Migration note

- Public: `/audio/v1/<route>` → `/v1/audio/<route>` for all 25 routes. Scalar regenerates from the app, so the docs move with it.
- Internal: unchanged.
- Anyone who integrated against the accidental path in the last two days must be told; the repo has no consumer to fix. Check with JojApi before deploying C2.

---

## 7. Rejected from the original plan (with evidence)

| Original item                                                           | Why it is rejected                                                                                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-detect `request.server.s3` via a `FastifyInstance` augmentation    | Does not compile: `apps/api` already declares `s3: S3Plugin` (required). TS2687 + TS2717, reproduced 2026-11-19. Fixing it means moving the decorator's type owner, inverting the dependency. |
| Delete `AudioStoragePort` / `AudioStorageOptions` wholesale             | The port is not the problem; the `fp` wrapper and the static `autoConfig` were. Keep an optional port; the app wires its own adapter (3.4).                                                   |
| Delete `declareAudioResponseHeader`                                     | Real per-app difference: public declares the header, internal returns inline and must not.                                                                                                    |
| Delete `src/schema.ts` as "dead machinery"                              | Four audio routes call it. It is not dead; it survives C2.                                                                                                                                    |
| `rateLimit: false` on the two `get_task` routes                         | Unbounded polling on the API's cheapest-to-abuse endpoint. C4 proposes a budget.                                                                                                              |
| Delete `descriptions` / `consumes` because "unused"                     | They are orphaned, not unused. The content is restored in C1 first; `consumes` is honoured by `fastify-zod-openapi` (multipart), so it changes the Scalar document.                           |
| Dummy `audioStorage` in `autoConfig`                                    | An artefact of `autoConfig` being evaluated outside a Fastify instance. C2 removes the need instead of codifying it.                                                                          |
| Verification list without `build`, `format:check`, `lint`, `check:deps` | AGENTS §5.5; `devExports` masks `dist` breakage locally.                                                                                                                                      |

---

## 8. Out of scope (recorded, not started)

- **Studios (D4):** dashboard-only; live in `apps/api` on the session surface, `schema: { hide: true }` so they do not appear in the public Scalar document; application services + ports in a domain package; never in `@itsrose/api-routes`, never in `api-internal`.
- **Asset policy (D5):** user uploads signed, API output public; namespace, retention, per-plan quota, signed-URL TTL. Design before the first studio endpoint.
- **`api-internal` basic guard (D6):** deferred by decision.
- **Storage implementation:** `@itsrose/auth-storage` already namespaces `t/users/{userId}/…`; durable studio assets need a separate namespace and policy.
