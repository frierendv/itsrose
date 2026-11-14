import type { FastifyRequest } from "fastify";
import type { SharedRoutesOptions } from "./options";

/**
 * The value of the `response-audio-format` request header.
 */
export type AudioFormat = string | string[] | undefined;

/**
 * Decides whether the audio of a response is handed to object storage.
 */
export type AudioUploadCondition = (audioFormat: AudioFormat) => boolean;

/**
 * Uploads the audio unless the caller explicitly asked for the inline payload.
 *
 * Used by `/music_compose`.
 */
export const uploadUnlessBase64: AudioUploadCondition = (audioFormat) =>
	audioFormat !== "base64";

/**
 * Uploads the audio only when the caller asked for a URL.
 *
 * Used by `/text_to_speech`, `/text_to_dialogue` and `/speech_to_speech`.
 */
export const uploadWhenUrlRequested: AudioUploadCondition = (audioFormat) =>
	audioFormat === "url";

/**
 * Hands the generated audio to the storage port of the mounting app.
 *
 * The port is only consulted when the app asked for uploads, so an app
 * without object storage never touches it - and never needs to provide it.
 *
 * @param request - The request the audio was produced for.
 * @param audio - The base64 encoded audio.
 * @param audioFormat - The requested audio format.
 * @param shouldUpload - Whether this route uploads for the given format.
 * @param options - The options of the mounting app.
 * @returns The URL of the stored audio, or the inline payload.
 */
export const uploadAudio = async (
	request: FastifyRequest,
	audio: string,
	audioFormat: AudioFormat,
	shouldUpload: AudioUploadCondition,
	options: SharedRoutesOptions
): Promise<string> => {
	if (!options.uploadAudioToStorage) {
		return audio;
	}

	if (!shouldUpload(audioFormat)) {
		return audio;
	}

	return options.audioStorage.uploadBase64Audio(request, audio);
};
