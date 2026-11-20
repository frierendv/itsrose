/**
 * The ElevenLabs client, replaced by a stub.
 *
 * The route tests never reach an upstream: they assert what the route does
 * with the audio it produced, not what the upstream answered.
 */
import {
	ElevenLabsCreateIVCVoiceResponseSchema,
	ElevenLabsCreateIVCVoiceSchema,
	ElevenLabsListModelsResponseSchema,
	ElevenLabsListVoicesResponseSchema,
	ElevenLabsListVoicesSchema,
	ElevenLabsSharedResponseAudioSchema,
	ElevenLabsSharedResponseSchema,
	ElevenLabsSpeechToSpeechConvertSchema,
	ElevenLabsTextToDialogueConvertSchema,
	ElevenLabsTextToSpeechConvertSchema,
	MusicComposeDetailedResponseSchema,
	MusicComposePlanResponseSchema,
	MusicComposePlanSchema,
	MusicComposeSchema,
	WithTimestampSchema,
	type IElevenLabsCreateIVCVoiceResponse,
	type IElevenLabsListVoicesResponse,
} from "../../../features/elevenlabs/src/zod-schema";

export { ElevenLabsSharedResponseAudioSchema, WithTimestampSchema };

/* -------------------------------------------------------------------------- */
/*                              Controlled upstream                           */
/* -------------------------------------------------------------------------- */

/**
 * What the stubs answer, and which of them were called.
 *
 * A route test that asserts *whether* the route reached the client, or that
 * needs a non-empty voice list, drives this state instead of re-mocking the
 * module. `resetElevenLabsMock` restores the defaults; the suite has
 * `clearMocks: false`, so a test must reset what it changed.
 */
const upstream: {
	voices: IElevenLabsListVoicesResponse["voices"];
	createError: Error | null;
	calls: string[];
} = {
	voices: [],
	createError: null,
	calls: [],
};

/** Replaces the voice list `getVoices` answers with. */
export const setVoices = (
	voices: IElevenLabsListVoicesResponse["voices"]
): void => {
	upstream.voices = voices;
};

/** Makes the next `createIVCVoice` calls reject with the given error. */
export const setCreateIVCVoiceError = (error: Error | null): void => {
	upstream.createError = error;
};

/** The client calls the routes made, in order. */
export const elevenLabsCalls: readonly string[] = upstream.calls;

/** Restores the stub defaults and clears the recorded calls. */
export const resetElevenLabsMock = (): void => {
	upstream.voices = [];
	upstream.createError = null;
	upstream.calls.length = 0;
};

export const createIVCVoice =
	async (): Promise<IElevenLabsCreateIVCVoiceResponse> => {
		upstream.calls.push("createIVCVoice");
		if (upstream.createError) {
			throw upstream.createError;
		}
		return {
			voice_id: "voice",
			requires_verification: false,
		};
	};
export const createIVCVoiceSchema = {
	request: ElevenLabsCreateIVCVoiceSchema,
	response: ElevenLabsCreateIVCVoiceResponseSchema,
};

export const getModels = async () => ({ models: [] });
export const getModelsSchema = { response: ElevenLabsListModelsResponseSchema };

export const getVoices = async (): Promise<IElevenLabsListVoicesResponse> => {
	upstream.calls.push("getVoices");
	return { voices: upstream.voices };
};
export const getVoicesSchema = {
	request: ElevenLabsListVoicesSchema,
	response: ElevenLabsListVoicesResponseSchema,
};

const COMPOSITION_PLAN = {
	positive_global_styles: ["pop"],
	negative_global_styles: [],
	sections: [
		{
			section_name: "Verse",
			positive_local_styles: ["soft"],
			negative_local_styles: [],
			duration_ms: 30_000,
			lines: ["Hello"],
		},
	],
};

export const musicCompose = async () => ({
	audio: "music-audio",
	composition_plan: COMPOSITION_PLAN,
	song_metadata: {
		description: null,
		genres: [],
		is_explicit: false,
		languages: [],
		title: "title",
	},
});
export const musicComposeSchema = {
	request: MusicComposeSchema,
	response: MusicComposeDetailedResponseSchema,
};

export const musicComposePlan = async () => COMPOSITION_PLAN;
export const musicComposePlanSchema = {
	request: MusicComposePlanSchema,
	response: MusicComposePlanResponseSchema,
};

export const speechToSpeech = async () => {
	upstream.calls.push("speechToSpeech");
	return { audio: "speech-audio" };
};
export const speechToSpeechSchema = {
	request: ElevenLabsSpeechToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToDialogue = async () => {
	upstream.calls.push("textToDialogue");
	return { audio: "dialogue-audio" };
};
export const textToDialogueSchema = {
	request: ElevenLabsTextToDialogueConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToSpeech = async () => {
	upstream.calls.push("textToSpeech");
	return { audio: "speech-audio" };
};
export const textToSpeechSchema = {
	request: ElevenLabsTextToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToSpeechWithTiming = async () => {
	upstream.calls.push("textToSpeechWithTiming");
	return {
		audio: "timing-audio",
		alignment: {
			characters: ["H"],
			character_start_times_seconds: [0],
			character_end_times_seconds: [1],
		},
		normalized_alignment: {
			characters: ["H"],
			character_start_times_seconds: [0],
			character_end_times_seconds: [1],
		},
	};
};
