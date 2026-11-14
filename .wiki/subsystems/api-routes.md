# Shared route surface

`packages/api-routes` — `@itsrose/api-routes`. The Fastify routes and the
error envelope that `apps/api` and `apps/api-internal` share. As of
`2026-11-14`, on `development` of `frierendv/itsrose`.

## What it is

**One route module per package.** Each module is registered on its own, owns
its URL namespace, and is mounted under a prefix the application chooses.

| Subpath                            | Plugin              | Default prefix  | Routes |
| ---------------------------------- | ------------------- | --------------- | ------ |
| `@itsrose/api-routes/audio`        | `audioRoutes`       | `/audio`        | 9      |
| `@itsrose/api-routes/character-ai` | `characterAiRoutes` | `/character_ai` | 2      |
| `@itsrose/api-routes/instagram`    | `instagramRoutes`   | `/instagram`    | 1      |
| `@itsrose/api-routes/mtxx`         | `mtxxRoutes`        | `/mtxx`         | 7      |
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

## The prefix is the module's own

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

## What is still data, not structure

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

## The breaking change

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
