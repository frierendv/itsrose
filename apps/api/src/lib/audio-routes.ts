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
 * Generated audio is written under the `generated` storage class
 * (`t/users/{userId}/generated/…`): it keeps its public URL because the caller
 * plays it immediately, and it expires under the 1-day lifecycle rule. Keeping
 * it out of `temp` is what lets the policy tell generated output from a user
 * upload; the studio endpoint copies it into the durable library on promotion.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const audioRoutesPlugin: FastifyPluginAsync = async (
	fastify
): Promise<void> => {
	const audioStorage: AudioStoragePort = {
		uploadBase64Audio: (request, base64Audio) =>
			fastify.s3.uploadGeneratedFileUrl(request, base64Audio, {
				preprocess: (data) => Buffer.from(data, "base64"),
			}),
	};

	await fastify.register(audioRoutes, {
		declareAudioResponseHeader: true,
		audioStorage,
	});
};
