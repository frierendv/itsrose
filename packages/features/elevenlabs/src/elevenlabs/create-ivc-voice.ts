import { SharedFileBufferSchema } from "@itsrose/shared-schema";
import { ThirdPartyApiError } from "@itsrose/system";
import { z } from "zod/v4";
import { httpClient } from "../client";
import {
	ElevenLabsCreateIVCVoiceResponseSchema,
	ElevenLabsCreateIVCVoiceSchema,
	type IElevenLabsCreateIVCVoice,
	type IElevenLabsCreateIVCVoiceResponse,
} from "../zod-schema";

/**
 * Creates an Instant Voice Cloning (IVC) voice profile from uploaded audio samples.
 *
 * @param {Buffer[]} files Array of audio sample buffers (1 to 5 files).
 * @param {IElevenLabsCreateIVCVoice} opts Voice creation parameters (name, description, labels).
 * @returns {Promise<IElevenLabsCreateIVCVoiceResponse>} Created voice details including voice_id.
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
 */
export async function createIVCVoice(
	files: Buffer[],
	opts: IElevenLabsCreateIVCVoice
): Promise<IElevenLabsCreateIVCVoiceResponse> {
	const formData = new FormData();
	// Append the files to the form data
	for (const [index, file] of files.entries()) {
		const blob = new Blob([Buffer.from(file)], {
			type: "application/octet-stream",
		});
		formData.append(`files[${index}]`, blob, `file_${index}`);
	}
	// Append the options to the form data
	Object.entries(opts).forEach(([key, value]) => {
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
	return ElevenLabsCreateIVCVoiceResponseSchema.parse(data);
}

/**
 * Zod schemas for instant voice cloning request and response validation.
 */
export const createIVCVoiceSchema = {
	request: z
		.object({
			files: z.union([
				SharedFileBufferSchema,
				z
					.array(SharedFileBufferSchema)
					.min(1, "At least one file is required")
					.max(5, "A maximum of 5 files are allowed"),
			]),
		})
		.and(ElevenLabsCreateIVCVoiceSchema),
	response: ElevenLabsCreateIVCVoiceResponseSchema,
};
