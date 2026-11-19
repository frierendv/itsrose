/**
 * The Fastify surface `apps/api` and `apps/api-internal` share.
 *
 * The routes live in one module per package - `@itsrose/api-routes/audio`,
 * `@itsrose/api-routes/character-ai`, `@itsrose/api-routes/instagram`,
 * `@itsrose/api-routes/mtxx`, `@itsrose/api-routes/remini` and
 * `@itsrose/api-routes/tiktok`. Each module is a plain Fastify plugin with
 * relative route URLs, so the mounting application owns the URL namespace:
 * it registers the module under the prefix it wants. An application registers
 * the modules it serves; the modules it does not register are never loaded,
 * so their clients - and their credentials - stay out of the application.
 *
 * This barrel is deliberately free of feature imports: it holds the pieces
 * every application needs, whatever routes it serves.
 *
 * @packageDocumentation
 */
export { apiErrorHandler } from "./error-handler";
export type { ApiErrorHandlerOptions, ErrorMapper } from "./error-handler";
export { ROUTE_MODULE_PREFIXES } from "./options";
export type { AudioStoragePort, RouteModuleName } from "./options";
