/**
 * The Fastify surface `apps/api` and `apps/api-internal` share.
 *
 * Both apps mount the same routes and the same error envelope; what they do
 * differently is data, handed in as options at mount time.
 *
 * @packageDocumentation
 */
export {
	uploadAudio,
	uploadUnlessBase64,
	uploadWhenUrlRequested,
} from "./audio";
export type { AudioFormat, AudioUploadCondition } from "./audio";
export { apiErrorHandler } from "./error-handler";
export type { ApiErrorHandlerOptions, ErrorMapper } from "./error-handler";
export { SHARED_ROUTE_KEYS, type SharedRoutesOptions } from "./options";
export type {
	AudioStorageOptions,
	AudioStoragePort,
	SharedRouteConsumes,
	SharedRouteDescriptions,
	SharedRouteKey,
} from "./options";
export { sharedRoutes } from "./plugin";
