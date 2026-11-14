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

export const createIVCVoice = async () => ({ audio: "ivc-audio" });
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

export const musicCompose = async () => ({ audio: "music-audio" });
export const musicComposeSchema = {
	request: MusicComposeSchema,
	response: MusicComposeDetailedResponseSchema,
};

export const musicComposePlan = async () => ({ plan: {} });
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

export const textToSpeechWithTiming = async () => ({ audio: "timing-audio" });
