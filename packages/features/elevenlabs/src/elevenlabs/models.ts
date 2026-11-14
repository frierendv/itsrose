import { httpClient } from "../client";
import {
	ElevenLabsListModelsResponseSchema,
	type IElevenLabsListModelsResponse,
} from "../zod-schema";

/**
 * Fetches all available ElevenLabs AI synthesis models.
 *
 * @returns {Promise<IElevenLabsListModelsResponse>} List of available speech models.
 * @throws {UpstreamApiError} If the ElevenLabs API returns an error status code
 * or answers with a payload that does not match the published schema.
 */
export async function getModels(): Promise<IElevenLabsListModelsResponse> {
	const models = await httpClient.send({
		url: "/v1/models",
		schema: ElevenLabsListModelsResponseSchema.shape.models,
	});

	return { models };
}

/**
 * Zod schemas for fetching ElevenLabs models.
 */
export const getModelsSchema = {
	response: ElevenLabsListModelsResponseSchema,
};
