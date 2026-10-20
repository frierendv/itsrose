export type ApiResponse<T = object> =
	| { ok: true; message: string; data: T }
	| { ok: false; message: string; data: null };

export type VoiceCategory = "all" | "premade" | "professional" | string;

export type Voice = {
	voice_id: string;
	name: string;
	category: VoiceCategory | null;
	description: string | null;
	preview_url: string | null;
	labels?: Record<string, string>;
	high_quality_base_model_ids?: string[];
	settings?: Record<string, unknown> | null;
};

export type ModelLanguage = {
	language_id: string;
	name: string;
};

export type Model = {
	model_id: string;
	name: string;
	description: string;
	maximum_text_length_per_request: number;
	can_do_voice_conversion: boolean;
	can_do_text_to_speech: boolean;
	languages: ModelLanguage[];
};

export type VoiceSettings = {
	/** Stability between 0.0 and 1.0 */
	stability: number;
	/** Similarity boost between 0.0 and 1.0 */
	similarity_boost: number;
	/** Style exaggeration between 0.0 and 1.0 */
	style: number;
	/** Playback speed between 0.7 and 1.2 */
	speed: number;
	/** Speaker boost toggle */
	use_speaker_boost: boolean;
};

export type TextToSpeechRequest = {
	text: string;
	voice_id: string;
	model_id?: string;
	voice_settings?: Partial<VoiceSettings>;
	output_format?: string;
};

export type CharacterAlignment = {
	characters: string[];
	character_start_times_seconds: number[];
	character_end_times_seconds: number[];
};

export type CharacterAlignmentResponse = {
	alignment: CharacterAlignment;
	normalized_alignment: CharacterAlignment;
};

export type TextToSpeechResponse = {
	audio_base64: string;
} & CharacterAlignmentResponse;

export type HistoryItem = {
	id: string;
	timestamp: number;
	text: string;
	voiceId: string;
	voiceName: string;
	modelId: string;
	modelName: string;
	audioSrc: string;
	alignment?: CharacterAlignment;
	duration?: number;
	settings?: Partial<VoiceSettings>;
};
