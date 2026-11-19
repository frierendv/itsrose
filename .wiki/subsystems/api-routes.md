# Shared route surface

`packages/api-routes` — `@itsrose/api-routes`. The Fastify routes and the
error envelope that `apps/api` and `apps/api-internal` share. As of
`2026-11-14`, on `development` of `frierendv/itsrose`; updated `2026-11-19`
at `fa8c1b6` — see [Native prefixes](#native-prefixes-2026-11-19).

## What it is

**One route module per package.** Each module is registered on its own and
is mounted under a prefix the application chooses.

| Subpath                            | Plugin              | Namespace       | Routes |
| ---------------------------------- | ------------------- | --------------- | ------ |
| `@itsrose/api-routes/audio`        | `audioRoutes`       | `/audio`        | 9      |
| `@itsrose/api-routes/character-ai` | `characterAiRoutes` | `/character_ai` | 3      |
| `@itsrose/api-routes/instagram`    | `instagramRoutes`   | `/instagram`    | 1      |
| `@itsrose/api-routes/mtxx`         | `mtxxRoutes`        | `/mtxx`         | 7      |
| `@itsrose/api-routes/pixverse`     | `pixverseRoutes`    | `/pixverse`     | 3      |
| `@itsrose/api-routes/remini`       | `reminiRoutes`      | `/remini`       | 1      |
| `@itsrose/api-routes/tiktok`       | `tiktokRoutes`      | `/tiktok`       | 1      |

The barrel `@itsrose/api-routes` holds only what every application needs:
the error handler, the prefix helpers, the option types and the namespace
registry. It imports no feature package, so importing the barrel never loads
a feature client.

## The one shared route surface — superseded

**Claimed at `6a6a28f` (2026-11-14):** "`@itsrose/api-routes` holds the
sixteen routes and the error envelope; both apps mount it and pass their
options."

**Superseded 2026-11-14.** The single `sharedRoutes` plugin became one
module per package. Two things were wrong with the single surface:

- **It could not be mounted selectively.** `apps/api-internal` mounted every
  route of the shared surface, including the character.ai ones that were
  supposed to be public-API-only — and the character.ai routes were not even
  in the package; they sat in `apps/api/src/routes/character_ai/`, so the
  two apps had two different shapes of the same surface.
- **It could not boot without every credential.** The feature clients read
  their credentials from the environment when they are _imported_. One
  barrel that imported all of them meant an application could not start
  without the credentials of a package it never served.

The modules are the fix for both: an application registers the modules it
serves, and a module it does not register is never imported.

## The prefix is the module's own — superseded

**Superseded 2026-11-19 at `fa8c1b6`** — see
[Native prefixes](#native-prefixes-2026-11-19).

**Added 2026-11-18.** `@itsrose/api-routes/pixverse` — the first module that
answers in the shared `SyncState` vocabulary (`not_started` / `in_progress` /
`completed` / `failed`) for an upstream that reports numeric codes. The
translation lives in the feature package
(`packages/features/pixverse/src/utils/translate-task.ts`), not in the route,
so the module stays a thin controller and any other consumer of the package
gets the translated payload too.

**Recorded 2026-11-14.** Fastify does not apply a register-time `prefix` to
a `fastify-plugin`-wrapped plugin — the prefix is silently dropped, and the
route lands at the root. Every module therefore builds its own URLs from the
`prefix` option:

```ts
url: joinUrl(prefix, "/text_to_speech");
```

`resolvePrefix` normalizes what the application passes (`undefined` → the
module default, `""` → the root, `"audio"` → `"/audio"`, `"//audio//v2//"` →
`"/audio/v2"`) and refuses a prefix that would change the meaning of the
URL. `claimRoutePrefix` records the claim per application — the registry is
keyed by the HTTP server, because the root instance and every encapsulated
child share that server while two applications in the same process never do.
Two modules may not share a namespace; the collision surfaces at boot.

## Correction, 2026-11-19: what the app actually served

**Corrected 2026-11-19.** The URL table in "The breaking change" was true at
`2026-11-14` and stopped being true on `2026-11-17` with `15eaa26`
(_refactor(routes): autoload v1 routes in api and remove route-modules
helper_).

`apps/api` autoloads `routes/v1/…` with `dirNameRoutePrefix: true`, and
`@fastify/autoload@6.5.1` prepends `autoConfig.prefix` to the folder name
(`pluginOptions.prefix = (pluginOptions.prefix || "") + prefix`). The modules
passed `prefix: "/audio"`, so the app served `/audio/v1/text_to_speech` —
not `/audio/text_to_speech`. Verified by autoloading the real route directory
with `tsx`, and with a standalone autoload probe.

No test noticed, because the package's tests register the modules directly
and no test asserted the application's route table. `@fastify/autoload` also
cannot be exercised under vitest: it dynamic-imports the files through Node,
not Vite, so a TypeScript route file fails to load in `pnpm test`.

The same commit dropped the public API's OpenAPI `descriptions` and
`consumes` overrides — the `text_to_dialogue` sample links, four mtxx example
tables, and `create_clone_voice` → `multipart/form-data`.

**Decided 2026-11-19** — see
[the public route surface](../decisions/public-route-surface.md): the public
shape is `/{version}/{module}/{route}` (`/v1/audio/text_to_speech`),
documentation lives in the route definitions, and the mechanism below
(`resolvePrefix`, `joinUrl`, `claimRoutePrefix`) is removed in favour of
native Fastify prefixes plus an explicit, testable route table in `apps/api`.

## What is still data, not structure — superseded

**Superseded 2026-11-19 at `fa8c1b6`** — the option axes below are deleted;
the audio capabilities survive, see
[Native prefixes](#native-prefixes-2026-11-19).

The four difference axes survived the split, because they are data:

- `uploadAudioToStorage` + `audioStorage` — whether the generated audio is
  handed to object storage, and by whom.
- `declareAudioResponseHeader` — whether `response-audio-format` is declared.
- `descriptions` — the OpenAPI text of a route, per route key. The keys are
  the routes of _that_ module, so an application cannot document a route of
  another package by mistake.
- `consumes` — the request content types of a route, per route key.

**The per-route upload condition was NOT unified**, because it genuinely
differs: `/music_compose` uploads unless the caller asked for the inline
payload, the three speech routes upload only when a URL was asked for.

## The breaking change — superseded

**Superseded 2026-11-19 at `fa8c1b6`** — the public paths are now
`/{version}/{module}/{route}`; see
[Native prefixes](#native-prefixes-2026-11-19).

The default prefix is the package name, so the public URLs moved:

| Before                 | After                        |
| ---------------------- | ---------------------------- |
| `POST /text_to_speech` | `POST /audio/text_to_speech` |
| `POST /remove_bg`      | `POST /mtxx/remove_bg`       |
| `GET /get_media`       | `GET /instagram/get_media`   |
| `POST /create_task`    | `POST /remini/create_task`   |
| `GET /get_content`     | `GET /tiktok/get_content`    |

The character.ai routes kept their URLs (`/character_ai/search_character`,
`/character_ai/send_message`), because their default prefix is
`/character_ai`. `GET /mtxx/get_task` — previously internal-only — became
available on both apps.

No in-repo consumer depended on the old paths.

## The error envelope

`apiErrorHandler` maps, in order: a `FailureResponse` as it is, a
`ThirdPartyApiError` to `EXTERNAL_SERVICE_ERROR`, an `InvalidRequestError` to
`INVALID_REQUEST`, a `SystemError` to `INTERNAL_ERROR`, a validation failure
to `VALIDATION_ERROR` (naming the field from the issue path), the
application's own mappers, a Fastify error that carries a 4xx status to
`INVALID_REQUEST` with that status, and everything else to
`UNHANDLED_EXCEPTION`.

The application mappers run _before_ the 4xx branch, so `apps/api`'s
better-auth mapper still wins.

## Native prefixes, 2026-11-19

**Recorded 2026-11-19 at `fa8c1b6`** (_refactor(api-routes): serve the
public surface at /v1/<module>_). This supersedes "The prefix is the
module's own" and the option axes in "What is still data, not structure".

- `src/prefix.ts` and `src/compose.ts` are deleted: `resolvePrefix`,
  `joinUrl`, `claimRoutePrefix` and `registerRouteModule` no longer exist.
  Fastify's own duplicate-route error covers the collision that mattered.
- Each module is a plain `FastifyPluginAsync` with relative route URLs, not
  a `fastify-plugin` wrapper. The mounting application passes Fastify's
  native `{ prefix }`, which now applies because the plugin is not wrapped.
- `ROUTE_MODULE_PREFIXES` survives as the namespace registry the
  applications mount with; a module no longer reads it and has no default
  prefix.
- `apps/api` registers the public surface from one explicit table,
  `apps/api/src/lib/routes.ts`, under `API_VERSION = "/v1"`, so the public
  paths are `/{version}/{module}/{route}`: `/v1/audio/text_to_speech`,
  `/v1/mtxx/remove_bg`, `/v1/pixverse/get_task`. The table is 25 routes;
  `apps/api/src/routes/v1/` is deleted.
- `apps/api/__tests__/route-table.test.ts` asserts all 25 paths and that no
  path stays under `/audio/v1/` — the regression test for `15eaa26`.
- `apps/api-internal` keeps the unversioned `/audio/*`, `/instagram/*`,
  `/mtxx/*`, `/remini/*` and `/tiktok/*` paths (19 routes); it registers the
  same modules directly with the same namespaces.
- The `prefix`, `descriptions` and `consumes` options are deleted. Route
  documentation is owned by the route definition (restored at `b80b6ee`),
  and the namespace is owned by the application's table.
- `AudioRoutesOptions` is `declareAudioResponseHeader` plus an optional
  `audioStorage` port. Without the port the routes return the payload
  inline; `uploadAudioToStorage` and the port-presence union are gone.
  `apps/api` wires `fastify.s3.uploadUserFileUrl` as its port.
