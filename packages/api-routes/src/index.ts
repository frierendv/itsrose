/**
 * The Fastify surface `apps/api` and `apps/api-internal` share.
 *
 * The routes live in one module per package - `@itsrose/api-routes/audio`,
 * `@itsrose/api-routes/character-ai`, `@itsrose/api-routes/instagram`,
 * `@itsrose/api-routes/mtxx`, `@itsrose/api-routes/remini` and
 * `@itsrose/api-routes/tiktok`. An application registers the modules it
 * serves; the modules it does not register are never loaded, so their
 * clients - and their credentials - stay out of the application.
 *
 * This barrel is deliberately free of feature imports: it holds the pieces
 * every application needs, whatever routes it serves.
 *
 * @packageDocumentation
 */
export { registerRouteModule } from "./compose";
export { apiErrorHandler } from "./error-handler";
export type { ApiErrorHandlerOptions, ErrorMapper } from "./error-handler";
export { ROUTE_MODULE_PREFIXES } from "./options";
export type {
	AudioStorageOptions,
	AudioStoragePort,
	RouteModuleName,
	RouteModuleOptions,
} from "./options";
export { claimRoutePrefix, joinUrl, resolvePrefix } from "./prefix";
export type { RoutePrefix } from "./prefix";

export type { AudioRouteKey, AudioRoutesOptions } from "./audio/options";
export type {
	CharacterAiRouteKey,
	CharacterAiRoutesOptions,
} from "./character-ai/options";
export type {
	InstagramRouteKey,
	InstagramRoutesOptions,
} from "./instagram/options";
export type { MtxxRouteKey, MtxxRoutesOptions } from "./mtxx/options";
export type { ReminiRouteKey, ReminiRoutesOptions } from "./remini/options";
export type { TiktokRouteKey, TiktokRoutesOptions } from "./tiktok/options";
