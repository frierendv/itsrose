import { neverRetry } from "@itsrose/upstream-client";
import { assetClient, httpClient } from "../client";
import {
	ElevenLabsCreateIVCVoiceResponseSchema,
	ElevenLabsCreateIVCVoiceSchema,
	type IElevenLabsCreateIVCVoice,
	type IElevenLabsCreateIVCVoiceResponse,
} from "../zod-schema";

const resolveAudioFiles = async (urls: string[], formData: FormData) => {
	for await (const [index, url] of urls.entries()) {
		const file = await assetClient
			.send<Buffer>({ url, responseType: "arraybuffer" })
			.catch(() => undefined);
		if (!file) {
			continue;
		}
		const blob = new Blob([Buffer.from(file)], {
			type: "application/octet-stream",
		});
		formData.append(`files[${index}]`, blob, `file_${index}`);
	}
};

/**
 * Creates an Instant Voice Cloning (IVC) voice profile from uploaded audio samples.
 *
 * @param {IElevenLabsCreateIVCVoice} opts Voice creation parameters (name, description, labels).
 * @returns {Promise<IElevenLabsCreateIVCVoiceResponse>} Created voice details including voice_id.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function createIVCVoice(
	opts: IElevenLabsCreateIVCVoice
): Promise<IElevenLabsCreateIVCVoiceResponse> {
	const { audio_urls, ...rest } = opts;
	const formData = new FormData();
	// Append the files to the form data
	await resolveAudioFiles(audio_urls, formData);
	// Append the options to the form data
	Object.entries(rest).forEach(([key, value]) => {
		if (value !== undefined) {
			formData.append(
				key,
				typeof value === "object"
					? JSON.stringify(value)
					: String(value)
			);
		}
	});

	return httpClient.send({
		url: "/v1/voices/add",
		method: "post",
		data: formData,
		headers: { "Content-Type": "multipart/form-data" },
		schema: ElevenLabsCreateIVCVoiceResponseSchema,
		// The call creates a voice upstream: it must not be replayed.
		retry: { retryCondition: neverRetry },
	});
}

/**
 * Zod schemas for instant voice cloning request and response validation.
 */
export const createIVCVoiceSchema = {
	request: ElevenLabsCreateIVCVoiceSchema,
	response: ElevenLabsCreateIVCVoiceResponseSchema,
};
