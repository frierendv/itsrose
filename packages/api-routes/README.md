# @itsrose/api-routes

The Fastify routes and the error envelope that `apps/api` and
`apps/api-internal` share.

The package ships **one route module per package**. Each module is
registered on its own, owns its URL namespace, and can be mounted or skipped
per application. An application that does not register a module never loads
that module's client — and never needs its credentials.

## The modules

| Subpath                            | Plugin              | Default prefix  | Routes |
| ---------------------------------- | ------------------- | --------------- | ------ |
| `@itsrose/api-routes/audio`        | `audioRoutes`       | `/audio`        | 9      |
| `@itsrose/api-routes/character-ai` | `characterAiRoutes` | `/character_ai` | 2      |
| `@itsrose/api-routes/instagram`    | `instagramRoutes`   | `/instagram`    | 1      |
| `@itsrose/api-routes/mtxx`         | `mtxxRoutes`        | `/mtxx`         | 7      |
| `@itsrose/api-routes/remini`       | `reminiRoutes`      | `/remini`       | 1      |
| `@itsrose/api-routes/tiktok`       | `tiktokRoutes`      | `/tiktok`       | 1      |

The barrel `@itsrose/api-routes` holds only what every application needs —
the error handler, the prefix helpers, the option types — and imports no
feature package.

## Mounting a module

```ts
import { registerRouteModule } from "@itsrose/api-routes";
import { audioRoutes } from "@itsrose/api-routes/audio";
import type { FastifyInstance } from "fastify";

export const registerApiRouteModules = async (
	fastify: FastifyInstance
): Promise<void> => {
	await registerRouteModule(fastify, audioRoutes, {
		uploadAudioToStorage: true,
		audioStorage: {
			uploadBase64Audio: async (request, audio) =>
				fastify.s3.uploadUserFile(request, audio),
		},
		declareAudioResponseHeader: true,
		descriptions: {
			textToDialogue: "Convert text to dialogue.",
		},
		consumes: {
			createIvcVoice: ["multipart/form-data"],
		},
	});
};
```

An application that does not serve character.ai simply does not register
`characterAiRoutes`.

## The prefix

Every module takes an optional `prefix`:

- left out — the module uses its own default (the package name);
- `""` — the module's routes live at the root of the application;
- anything else — the module's routes live under that namespace.

Fastify does not apply a register-time `prefix` to a `fastify-plugin`-wrapped
plugin, so each module builds its own URLs from the option. Two modules may
not claim the same prefix: the collision surfaces when the application boots.

## The options

| Option                       | Applies to   | Meaning                                                   |
| ---------------------------- | ------------ | --------------------------------------------------------- |
| `prefix`                     | every module | The URL namespace of the module's routes                  |
| `descriptions`               | every module | The OpenAPI text of a route, keyed by the route           |
| `consumes`                   | every module | The request content types of a route, keyed by the route  |
| `uploadAudioToStorage`       | audio        | Whether the generated audio is handed to object storage   |
| `audioStorage`               | audio        | The port that performs the upload                         |
| `declareAudioResponseHeader` | audio        | Whether `response-audio-format` is declared on the routes |

The `descriptions` and `consumes` keys are the routes of _that_ module, so an
application cannot document a route of another package by mistake.

## The error envelope

`apiErrorHandler` maps every error to the standard failure envelope. The
applications register it themselves, and may add mappers for the errors only
they know about.
