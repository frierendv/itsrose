# The deletion test applied

**Decided 2026-11-14.** Landed as `2786b2b`.

## The decision

Three packages were cut because nothing called them.

| Package               | Why it went                                                                                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@itsrose/logger`     | 339 lines, 17 exports, 0 importers. Every app logs through Fastify's bundled pino, so the pretty transport, colour map and error serialiser were unreachable in every deployment.                                                                                                                                                     |
| `@itsrose/lowdb`      | A file-backed JSON database with no caller. Its `CryptoAdapter` was a hypothetical second adapter behind a seam that only ever had one.                                                                                                                                                                                               |
| `@itsrose/api-client` | Documented as "generated from the ItsRose OpenAPI surface", but there was no generator, no committed spec and no `ItsRoseAPIClient` — the README described a script (`scripts/generate-openapi.ts`) and a class that did not exist. Its published `.d.mts` imported a devDependency, which would have broken the first real consumer. |

## The reasoning

The deletion test asks: if this module disappeared, would complexity vanish or
reappear across N callers? For all three, nothing reappeared — no caller
existed. That is the one case where the test returns a verdict rather than a
question.

The cost was not only the code. `@itsrose/api-client`'s README described a
generator and a factory class that did not exist, so a reader's mental model of
the platform was wrong before any code ran.

## The seam rule this rests on

From the codebase-design vocabulary: _one adapter means a hypothetical seam, two
adapters means a real one_. `@itsrose/lowdb`'s encrypted adapter was the
second adapter of a seam that only ever had one.

## Related

- [The environment does not fail loudly](../problems/environment-does-not-fail-loudly.md)
