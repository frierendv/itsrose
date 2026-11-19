import type { AudioStoragePort } from "@itsrose/api-routes";
import { audioRoutes } from "@itsrose/api-routes/audio";
import type { FastifyPluginAsync } from "fastify";

/**
 * The audio routes of the public API.
 *
 * The audio module is the only route module with host-injected capabilities:
 * the public API declares the audio format header and stores generated audio
 * in object storage, so a caller that asks for a URL always receives one.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const audioRoutesPlugin: FastifyPluginAsync = async (
	fastify
): Promise<void> => {
	const audioStorage: AudioStoragePort = {
		uploadBase64Audio: (request, base64Audio) =>
			fastify.s3.uploadUserFileUrl(request, base64Audio, {
				preprocess: (data) => Buffer.from(data, "base64"),
			}),
	};

	await fastify.register(audioRoutes, {
		declareAudioResponseHeader: true,
		audioStorage,
	});
};
