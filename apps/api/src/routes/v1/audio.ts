import type { AudioRoutesOptions, AudioStoragePort } from "@itsrose/api-routes";
import { AUDIO_ROUTE_PREFIX, audioRoutes } from "@itsrose/api-routes/audio";
import fp from "fastify-plugin";

export const autoConfig: AudioRoutesOptions = {
	prefix: AUDIO_ROUTE_PREFIX,
	// handled in fp below
	declareAudioResponseHeader: true,
	uploadAudioToStorage: true,
	audioStorage: { uploadBase64Audio: async () => "" },
};

export default fp(async (fastify, options) => {
	const audioStorage: AudioStoragePort = {
		uploadBase64Audio: async (request, base64Audio) =>
			fastify.s3.uploadUserFile(request, base64Audio, {
				preprocess: (data) => Buffer.from(data, "base64"),
			}),
	};
	void fastify.register(audioRoutes, {
		...options,
		declareAudioResponseHeader: true,
		uploadAudioToStorage: true,
		audioStorage,
	});
});
