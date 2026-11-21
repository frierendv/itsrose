import {
	apiEndpoint,
	jsonRequestInit,
	requestApi,
	type ApiRequestOptions,
} from "@/lib/api/envelope";
import type { ZodType } from "zod/v4";
import {
	deleteGenerationSchema,
	generateSpeechResponseSchema,
	generationListSchema,
	generationUrlSchema,
	saveGenerationResponseSchema,
	type DeleteGeneration,
	type GenerateSpeechInput,
	type GenerateSpeechResponse,
	type GenerationList,
	type GenerationUrl,
	type ListGenerationsParams,
	type SaveGenerationInput,
	type SaveGenerationResponse,
} from "./types";

/**
 * The studio routes are mounted at the API root, not under `/auth`.
 *
 * The session cookie is shared across the API and dashboard subdomains, so the
 * browser talks to the API origin directly with `credentials: "include"`.
 */
const STUDIO_PREFIX = "/studio";

/** The surface name used in parser messages. */
const STUDIO_SURFACE = "studio API";

/** Headers forwarded on the server so the session cookie travels with the call. */
export type StudioRequestOptions = ApiRequestOptions;

function studioEndpoint(path: string): string {
	return apiEndpoint(`${STUDIO_PREFIX}${path}`);
}

async function requestStudio<T>(
	schema: ZodType<T>,
	path: string,
	init: RequestInit,
	options: StudioRequestOptions = {}
): Promise<T> {
	return requestApi(schema, studioEndpoint(path), init, {
		...options,
		surface: STUDIO_SURFACE,
	});
}

/**
 * Synthesises speech and stores the result as an ephemeral generation.
 *
 * The result is not in the durable asset library until `saveGeneration`
 * promotes it; `audio_url` expires at `expires_at`.
 */
export async function generateSpeech(
	input: GenerateSpeechInput,
	options?: StudioRequestOptions
): Promise<GenerateSpeechResponse> {
	return requestStudio(
		generateSpeechResponseSchema,
		"/speech",
		jsonRequestInit("POST", input),
		options
	);
}

/** Lists the authenticated user's generation history, newest first. */
export async function listGenerations(
	params: ListGenerationsParams = {},
	options?: StudioRequestOptions
): Promise<GenerationList> {
	const search = new URLSearchParams();
	if (params.feature !== undefined) {
		search.set("feature", params.feature);
	}
	if (params.limit !== undefined) {
		search.set("limit", String(params.limit));
	}
	if (params.offset !== undefined) {
		search.set("offset", String(params.offset));
	}
	const query = search.toString();

	return requestStudio(
		generationListSchema,
		`/generations${query ? `?${query}` : ""}`,
		{ method: "GET" },
		options
	);
}

/**
 * Mints a short-lived URL for one generation.
 *
 * A saved generation answers through the asset library (`source: "library"`);
 * an unsaved one answers through its ephemeral object (`source: "generated"`).
 */
export async function getGenerationUrl(
	generationId: string,
	options?: StudioRequestOptions
): Promise<GenerationUrl> {
	return requestStudio(
		generationUrlSchema,
		`/generations/${encodeURIComponent(generationId)}/url`,
		{ method: "GET" },
		options
	);
}

/**
 * Promotes a generated result into the durable asset library.
 *
 * Saving twice is one outcome: the API answers with the existing asset id and
 * `already_saved: true`.
 */
export async function saveGeneration(
	generationId: string,
	input: SaveGenerationInput = {},
	options?: StudioRequestOptions
): Promise<SaveGenerationResponse> {
	return requestStudio(
		saveGenerationResponseSchema,
		`/generations/${encodeURIComponent(generationId)}/save`,
		jsonRequestInit("POST", input),
		options
	);
}

/** Clears one generation; a saved result keeps its durable asset copy. */
export async function deleteGeneration(
	generationId: string,
	options?: StudioRequestOptions
): Promise<DeleteGeneration> {
	return requestStudio(
		deleteGenerationSchema,
		`/generations/${encodeURIComponent(generationId)}`,
		{ method: "DELETE" },
		options
	);
}
