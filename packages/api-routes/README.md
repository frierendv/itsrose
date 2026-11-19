# @itsrose/api-routes

The Fastify routes and the error envelope that `apps/api` and
`apps/api-internal` share.

The package ships **one route module per package**. Each module is a plain
Fastify plugin with relative route URLs, registered on its own and mounted
under whatever prefix the application chooses. An application that does not
register a module never loads that module's client — and never needs its
credentials.

## The modules

| Subpath                            | Plugin              | Namespace       | Routes |
| ---------------------------------- | ------------------- | --------------- | ------ |
| `@itsrose/api-routes/audio`        | `audioRoutes`       | `/audio`        | 9      |
| `@itsrose/api-routes/character-ai` | `characterAiRoutes` | `/character_ai` | 3      |
| `@itsrose/api-routes/instagram`    | `instagramRoutes`   | `/instagram`    | 1      |
| `@itsrose/api-routes/mtxx`         | `mtxxRoutes`        | `/mtxx`         | 7      |
| `@itsrose/api-routes/pixverse`     | `pixverseRoutes`    | `/pixverse`     | 3      |
| `@itsrose/api-routes/remini`       | `reminiRoutes`      | `/remini`       | 1      |
| `@itsrose/api-routes/tiktok`       | `tiktokRoutes`      | `/tiktok`       | 1      |

The namespace is the value in `ROUTE_MODULE_PREFIXES`; the package does not
apply it. The mounting application passes it as Fastify's native `prefix`.

The barrel `@itsrose/api-routes` holds only what every application needs —
the error handler and its types, the namespace registry, and the
`AudioStoragePort` type — and imports no feature package.

## Mounting a module

A route module is registered like any other Fastify plugin, with a native
`prefix`:

```ts
import { AUDIO_ROUTE_PREFIX, audioRoutes } from "@itsrose/api-routes/audio";
import { MTXX_ROUTE_PREFIX, mtxxRoutes } from "@itsrose/api-routes/mtxx";
import type { FastifyInstance } from "fastify";

export const registerRoutes = async (
	fastify: FastifyInstance
): Promise<void> => {
	await fastify.register(audioRoutes, {
		prefix: AUDIO_ROUTE_PREFIX,
		declareAudioResponseHeader: true,
		audioStorage: {
			uploadBase64Audio: (request, audio) =>
				fastify.s3.uploadUserFileUrl(request, audio, {
					preprocess: (data) => Buffer.from(data, "base64"),
				}),
		},
	});
	await fastify.register(mtxxRoutes, { prefix: MTXX_ROUTE_PREFIX });
};
```

An application that does not serve character.ai simply does not register
`characterAiRoutes`. `apps/api` wraps that call in a versioned table
(`apps/api/src/lib/routes.ts`) and mounts it under `/v1`, so the public URL is
`/v1/audio/text_to_speech`; `apps/api-internal` mounts the same modules
unversioned.

## The options

| Option                       | Applies to   | Meaning                                                              |
| ---------------------------- | ------------ | -------------------------------------------------------------------- |
| `prefix`                     | every module | Fastify's native register option: the URL namespace of the routes    |
| `declareAudioResponseHeader` | audio        | Whether `response-audio-format` is declared on the audio routes      |
| `audioStorage`               | audio        | The port that stores generated audio; omitted, it is returned inline |

The route documentation no longer travels through the options: a route's
`description`, `summary`, `tags` and `consumes` are part of its published
contract and live in the route definition, so every application mounts the
same document.

Two modules registered under the same prefix coexist unless they declare the
same method and path; that collision is Fastify's duplicate-route error at
boot.

## The error envelope

`apiErrorHandler` maps every error to the standard failure envelope. The
applications register it themselves, and may add mappers for the errors only
they know about.
