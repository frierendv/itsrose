import { SharedFileBufferSchema } from "@itsrose/shared-schema";
import { ThirdPartyApiError } from "@itsrose/system";
import { z } from "zod/v4";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsCreateIVCVoiceResponseSchema,
	ElevenLabsCreateIVCVoiceSchema,
	type IElevenLabsCreateIVCVoice,
	type IElevenLabsCreateIVCVoiceResponse,
} from "../zod-schema";

/**
 * Description placeholder
 *
 * @param {Buffer[]} files
 * @param {IElevenLabsCreateIVCVoice} opts
 * @returns {Promise<IElevenLabsCreateIVCVoiceResponse>}
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
	const { data, error } = await httpClient
		.post<IElevenLabsCreateIVCVoiceResponse>("/v1/voices/add", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		})
		.onError(parseElevenLabsError);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return ElevenLabsCreateIVCVoiceResponseSchema.parse(data);
}

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
