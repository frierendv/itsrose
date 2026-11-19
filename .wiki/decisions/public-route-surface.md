# The public route surface

**Decided 2026-11-19**, on `development` @ `60f6dbc`. Supersedes the "the
prefix is the module's own" mechanism recorded in
[the shared route surface](../subsystems/api-routes.md) on 2026-11-14. The
implementation follows in `plan-api-routes-refactor-v2.md` (repository root).

## The URL shape

The public API path is **`/{version}/{module}/{route}`**:
`/v1/audio/text_to_speech`, `/v1/mtxx/remove_bg`, `/v1/pixverse/get_task`.

- **Version outside, module inside.** The version is a property of the
  deployment, not of the module; a module must never know which version it is
  mounted under.
- The version is an explicit constant in the application (`API_VERSION`) and
  the route table is explicit, because a folder name silently decides URLs
  otherwise — see the correction below.
- `/auth/*` stays unversioned (Better Auth's base path), as do `/hooks` and
  `/status` (operational endpoints).

### Correction: what `apps/api` actually served between 2026-11-17 and today

The "breaking change" table in [the shared route surface](../subsystems/api-routes.md)
was true at `2026-11-14` and stopped being true on `2026-11-17` with
`15eaa26` (_refactor(routes): autoload v1 routes in api and remove
route-modules helper_).

`@fastify/autoload@6.5.1` **prepends** a plugin's `autoConfig.prefix` to the
folder-derived prefix (`handlePrefixConfig` does
`pluginOptions.prefix = (pluginOptions.prefix || "") + prefix`). With
`autoConfig.prefix = "/audio"` under `routes/v1/`, the app served
`/audio/v1/text_to_speech`. Verified 2026-11-19 by autoloading the real route
directory with `tsx` and by a standalone autoload probe; the same commit
removed the public API's `descriptions`/`consumes` overrides.

Nothing caught it because no test asserted the application's route table: the
package's tests register modules directly and kept asserting `/audio/*`, and
`@fastify/autoload` cannot be exercised under vitest (it dynamic-imports
TypeScript through Node, not Vite). That is why this decision pairs the URL
shape with an explicit route table that a test can assert.

## Where route documentation lives

In the route definitions, not in per-app options. A route's `description`,
`summary`, `tags` and `consumes` are part of its published contract; an
application mounting the module does not own them.

**Evidence (2026-11-19):** `fastify-zod-openapi@5.7.0` honours a `consumes`
array in the route schema — a route declaring `["multipart/form-data"]`
produces `requestBody.content["multipart/form-data"]` in the generated
document. `@fastify/swagger` alone ignores the key. So the mp-restored
`create_clone_voice` → multipart declaration is load-bearing, not decorative.

## What `@itsrose/api-routes` is for

A **stateless passthrough surface**: thin routes over the `@itsrose/features/*`
clients, shared by `apps/api` and `apps/api-internal`, mounted selectively so an
application never loads a client (or a credential) it does not serve.

It is **not** the home for:

- database access, repositories, or domain services;
- user or asset identity, ownership, retention, file lifecycle;
- quotas, billing meters, background jobs;
- anything a studio needs.

Rule of thumb: if the route needs a service layer and ports (AGENTS §3.1), it
is not an `api-routes` route. The host app's policy arrives as a small,
explicitly injected capability (`audioStorage`, `declareAudioResponseHeader`)
— never by the package reading the host's decorators from `request.server`.

## Studios are dashboard-only

The platform studios (speech-to-speech voice cloning, image
generation/edit, text/image-to-video) are authenticated dashboard features.
They are served by `apps/api` on the **session surface** — the pattern
`@itsrose/auth-billing` and `@itsrose/auth-usage` already use — and hidden
from the public Scalar document (`schema: { hide: true }`).

They must not appear in `@itsrose/api-routes` (they need services and
ownership), and must never be registered in `apps/api-internal` (the resale
proxy). The public API's role for them is the OpenAPI reference, not their
execution.

## Asset URLs

- **User-uploaded files** (voice samples, source images): served through
  **signed URLs**.
- **API-generated assets** (synthesis output, generated media): **public
  URLs**.

The category, namespace, retention and quota policy is still open; it must be
decided before the first studio endpoint ships. `@itsrose/auth-storage`
already namespaces ephemeral files under `t/users/{userId}/{category}/…`.

## Task polling is free, not unlimited

**Decided 2026-11-19.** `GET /{mtxx,pixverse}/get_task` is exempt from the
plan quota, but it keeps a rate budget.

- The route declares
  `config: { billable: false, rateLimit: { max: 600, timeWindow: 60_000 } }`.
- The request tracker forwards `billable`; `@itsrose/auth-usage` gates the
  billable counters on it (monthly quota, `requests_ok`, billable
  per-endpoint and per-key counters). Polls still count in the analytics
  buckets (`requests`, latency, endpoint totals), so the dashboard's traffic
  numbers stay truthful.
- Why both halves: polling exists because generation is asynchronous.
  Charging it makes the product's own design cost the user quota; leaving it
  unthrottled turns the cheapest endpoint into unbounded Redis and upstream
  work. Free is not the same as unmetered.
- The 600/minute budget is a starting constant, not a published promise.

## `api-internal` stays authless by design

JojApi has its own console, rate limiting, billable objects and plan
enforcement, so the ItsRose auth guard is not mounted there (D6, 2026-11-19).
A basic guard against someone who discovers the proxy endpoint is deferred.
Its paths stay unversioned and independent of the public API: the facade's
URLs are JojApi's decision.

## What this supersedes

- The "prefix is the module's own" mechanism (`joinUrl`, `resolvePrefix`,
  `claimRoutePrefix`, `fastify-plugin` wrapping) — removed in favour of native
  Fastify prefixes.
- The claim that the public URLs are `/audio/*` — corrected above.
- The `descriptions`/`consumes`/`prefix` module options — documentation moves
  into the routes, the prefix into the application's route table.
