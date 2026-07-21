import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsListModelsResponseSchema,
	type IElevenLabsListModelsResponse,
} from "../zod-schema";

/**
 * Description placeholder
 *
 * @returns {Promise<IElevenLabsListModelsResponse>}
 */
export async function getModels(): Promise<IElevenLabsListModelsResponse> {
	const { data, error } = await httpClient
		.get("/v1/models")
		.onError(parseElevenLabsError);
	if (error) {
		throw new ThirdPartyApiError(error.message, error.statusCode);
	}
	return ElevenLabsListModelsResponseSchema.parse({ models: data });
}

export const getModelsSchema = {
	response: ElevenLabsListModelsResponseSchema,
};
