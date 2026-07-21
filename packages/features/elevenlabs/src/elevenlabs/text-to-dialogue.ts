import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsSharedResponseSchema,
	ElevenLabsTextToDialogueConvertSchema,
	type IElevenLabsSharedResponse,
	type IElevenLabsTextToDialogueConvert,
} from "../zod-schema";

/**
 * Description placeholder
 *
 * @param {IElevenLabsTextToDialogueConvert} options
 * @returns {Promise<IElevenLabsSharedResponse>}
 */
export async function textToDialogue(
	options: IElevenLabsTextToDialogueConvert
): Promise<IElevenLabsSharedResponse> {
	const { output_format, ...restOptions } = options;
	const { data, error } = await httpClient
		.post<Buffer>("/v1/text-to-dialogue", restOptions, {
			params: {
				output_format,
				enable_logging: false,
			},
			responseType: "arraybuffer",
		})
		.onError(parseElevenLabsError);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return {
		audio_base64: Buffer.from(data).toString("base64"),
	};
}

export const textToDialogueSchema = {
	request: ElevenLabsTextToDialogueConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};
