import { buildUploadFormData, uploadAsset } from "@/features/assets/api";
import {
	apiEndpoint,
	jsonRequestInit,
	requestApi,
	type ApiRequestOptions,
} from "@/lib/api/envelope";
import type { ZodType } from "zod/v4";
import {
	createVoiceResponseSchema,
	deleteVoiceSchema,
	voiceListSchema,
	type CreateVoiceInput,
	type CreateVoiceOptions,
	type CreateVoiceResponse,
	type DeleteVoice,
	type VoiceList,
} from "./types";

/**
 * The voice routes are mounted at the API root, not under `/auth`.
 *
 * The session cookie is shared across the API and dashboard subdomains, so the
 * browser talks to the API origin directly with `credentials: "include"`.
 */
const STUDIO_VOICES_PREFIX = "/studio/voices";
const VOICES_PREFIX = "/voices";

/** The surface name used in parser messages. */
const VOICE_SURFACE = "voice API";

/** Headers forwarded on the server so the session cookie travels with the call. */
export type VoiceRequestOptions = ApiRequestOptions;

async function requestVoice<T>(
	schema: ZodType<T>,
	path: string,
	init: RequestInit,
	options: VoiceRequestOptions = {}
): Promise<T> {
	return requestApi(schema, apiEndpoint(path), init, {
		...options,
		surface: VOICE_SURFACE,
	});
}

/** Lists the caller's clones plus the platform's premade catalogue. */
export async function listVoices(
	options?: VoiceRequestOptions
): Promise<VoiceList> {
	return requestVoice(
		voiceListSchema,
		STUDIO_VOICES_PREFIX,
		{ method: "GET" },
		options
	);
}

/** Clones a voice from a sample asset already in the library. */
export async function createVoice(
	input: CreateVoiceInput,
	options?: VoiceRequestOptions
): Promise<CreateVoiceResponse> {
	return requestVoice(
		createVoiceResponseSchema,
		STUDIO_VOICES_PREFIX,
		jsonRequestInit("POST", input),
		options
	);
}

/** Deletes one owned clone, both upstream and from the ledger. */
export async function deleteVoice(
	voiceId: string,
	options?: VoiceRequestOptions
): Promise<DeleteVoice> {
	return requestVoice(
		deleteVoiceSchema,
		`${VOICES_PREFIX}/${encodeURIComponent(voiceId)}`,
		{ method: "DELETE" },
		options
	);
}

/**
 * Clones a voice from a local recording.
 *
 * Cross-feature import: the recording is uploaded into the durable asset
 * library first (`kind: "voice_sample"`), so the multipart handling stays in
 * the asset client instead of being duplicated here. The clone is then created
 * from the returned `asset_id`; the two calls are ordered, and a failed upload
 * never reaches the clone route.
 */
export async function createVoiceFromFile(
	file: File,
	options: CreateVoiceOptions,
	requestOptions?: VoiceRequestOptions
): Promise<CreateVoiceResponse> {
	const asset = await uploadAsset(
		buildUploadFormData({ kind: "voice_sample", file }),
		requestOptions
	);

	return createVoice(
		{
			asset_id: asset.asset_id,
			name: options.name,
			description: options.description,
		},
		requestOptions
	);
}
