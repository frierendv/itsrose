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
} from "../../../features/elevenlabs/src/zod-schema";

export { ElevenLabsSharedResponseAudioSchema, WithTimestampSchema };

export const createIVCVoice = async () => ({
	voice_id: "voice",
	requires_verification: false,
});
export const createIVCVoiceSchema = {
	request: ElevenLabsCreateIVCVoiceSchema,
	response: ElevenLabsCreateIVCVoiceResponseSchema,
};

export const getModels = async () => ({ models: [] });
export const getModelsSchema = { response: ElevenLabsListModelsResponseSchema };

export const getVoices = async () => ({ voices: [] });
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

export const speechToSpeech = async () => ({ audio: "speech-audio" });
export const speechToSpeechSchema = {
	request: ElevenLabsSpeechToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToDialogue = async () => ({ audio: "dialogue-audio" });
export const textToDialogueSchema = {
	request: ElevenLabsTextToDialogueConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToSpeech = async () => ({ audio: "speech-audio" });
export const textToSpeechSchema = {
	request: ElevenLabsTextToSpeechConvertSchema,
	response: ElevenLabsSharedResponseSchema,
};

export const textToSpeechWithTiming = async () => ({
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
});
