import { SharedFileBufferSchema } from "@itsrose/shared-schema";
import { ThirdPartyApiError } from "@itsrose/system";
import { neverRetry, parseUpstreamPayload } from "@itsrose/upstream-client";
import { z } from "zod/v4";
import { downloadRemoteMedia, httpClient } from "../client";
import { assertSafeRemoteMediaUrl } from "../utils";
import {
	ElevenLabsSharedResponseSchema,
	ElevenLabsSpeechToSpeechConvertSchema,
	type IElevenLabsSharedResponse,
	type IElevenLabsSpeechToSpeechConvert,
} from "../zod-schema";

async function getAudioBuffer(audio: Buffer | string): Promise<Buffer> {
	if (typeof audio === "string") {
		// A URL the guard refuses never reaches the network; its generic 400
		// is what the caller sees.
		const target = await assertSafeRemoteMediaUrl(audio);
		try {
			return await downloadRemoteMedia(target);
		} catch {
			throw new ThirdPartyApiError(
				"Failed to get audio from the provided URL.",
				400
			);
		}
	}
	return audio;
}

function appendFormDataOptions(
	formData: FormData,
	options: Record<string, unknown>
): void {
	Object.entries(options).forEach(([key, value]) => {
		if (value !== undefined) {
			formData.append(
				key,
				typeof value === "object"
					? JSON.stringify(value)
					: String(value)
			);
		}
	});
}

/**
 * Converts input speech audio into another voice using ElevenLabs Speech-to-Speech API.
 *
 * @param {Buffer | string} audio Input audio as a Buffer or URL string.
 * @param {IElevenLabsSpeechToSpeechConvert} options Conversion options including voice_id, model_id, and voice settings.
 * @returns {Promise<IElevenLabsSharedResponse>} Object containing base64-encoded converted audio data.
 * @throws {ThirdPartyApiError} If audio fetching fails.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function speechToSpeech(
	audio: Buffer | string,
	options: IElevenLabsSpeechToSpeechConvert
): Promise<IElevenLabsSharedResponse> {
	const { voice_id, output_format, ...restOptions } = options;
	const formData = new FormData();

	const audioBuffer: Buffer = await getAudioBuffer(audio);
	const blob = new Blob([Buffer.from(audioBuffer)], {
		type: "application/octet-stream",
	});
	formData.append("audio", blob, "input_audio");

	appendFormDataOptions(formData, restOptions);

	const converted = await httpClient.send<Buffer>({
		url: `/v1/speech-to-speech/${voice_id}`,
		method: "post",
		data: formData,
		params: {
			output_format,
			enable_logging: false,
		},
		headers: {
			"Content-Type": "multipart/form-data",
		},
		responseType: "arraybuffer",
		// The call is billed per generation: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});

	return parseUpstreamPayload(
		ElevenLabsSharedResponseSchema,
		{ audio: Buffer.from(converted).toString("base64") },
		{ service: "elevenlabs", label: "speech" }
	);
}

/**
 * Zod schemas for speech-to-speech request and response validation.
 */
export const speechToSpeechSchema = {
	request: z
		.object({
			audio: z.union([
				z
					.url()
					.describe(
						"Absolute URL to the audio file if not uploading directly"
					),
				SharedFileBufferSchema,
			]),
		})
		.and(ElevenLabsSpeechToSpeechConvertSchema),
	response: ElevenLabsSharedResponseSchema,
};
