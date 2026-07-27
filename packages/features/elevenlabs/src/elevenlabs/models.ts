import { ThirdPartyApiError } from "@itsrose/system";
import { httpClient, parseElevenLabsError } from "../client";
import {
	ElevenLabsListModelsResponseSchema,
	type IElevenLabsListModelsResponse,
} from "../zod-schema";

/**
 * Fetches all available ElevenLabs AI synthesis models.
 *
 * @returns {Promise<IElevenLabsListModelsResponse>} List of available speech models.
 * @throws {ThirdPartyApiError} If the ElevenLabs API returns an error status code.
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

/**
 * Zod schemas for fetching ElevenLabs models.
 */
export const getModelsSchema = {
	response: ElevenLabsListModelsResponseSchema,
};
