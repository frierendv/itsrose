import { fetcher } from "@itsrose/http-client";
import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient } from "../client";
import {
	ElevenLabsCreateIVCVoiceResponseSchema,
	ElevenLabsCreateIVCVoiceSchema,
	type IElevenLabsCreateIVCVoice,
	type IElevenLabsCreateIVCVoiceResponse,
} from "../zod-schema";

const resolveAudioFiles = async (urls: string[], formData: FormData) => {
	for await (const [index, url] of urls.entries()) {
		const { data: file } = await fetcher
			.get<Buffer>(url, { responseType: "arraybuffer" })
			.catch(() => ({ data: null }));
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
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
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
	const { data, error } =
		await httpClient.post<IElevenLabsCreateIVCVoiceResponse>(
			"/v1/voices/add",
			formData,
			{ headers: { "Content-Type": "multipart/form-data" } }
		);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return data;
}

/**
 * Zod schemas for instant voice cloning request and response validation.
 */
export const createIVCVoiceSchema = {
	request: ElevenLabsCreateIVCVoiceSchema,
	response: ElevenLabsCreateIVCVoiceResponseSchema,
};
