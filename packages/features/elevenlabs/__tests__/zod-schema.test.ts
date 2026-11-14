import {
	ElevenLabsListVoicesResponseSchema,
	MusicComposeDetailedResponseSchema,
} from "../src/zod-schema";

/**
 * The voice the upstream documents in its OpenAPI document
 * (`VoiceResponseModel` example), with the top-level fields the schema
 * requires filled in.
 */
const UPSTREAM_VOICE = {
	voice_id: "21m00Tcm4TlvDq8ikWAM",
	name: "Rachel",
	category: "professional",
	description: "A warm, expressive voice with a touch of humor.",
	preview_url:
		"https://storage.googleapis.com/eleven-public-prod/premade/voices/9BWtsMINqrJLrRacOk9x/405766b8-1f4e-4d3c-aba1-6f25333823ec.mp3",
	available_for_tiers: ["creator", "enterprise"],
	high_quality_base_model_ids: ["eleven_v2_flash", "eleven_multilingual_v2"],
	labels: { accent: "American", gender: "female" },
	is_legacy: false,
	is_mixed: false,
	is_owner: false,
	samples: [
		{
			sample_id: "DCwhRBWXzGAHq8TQ4Fs18",
			file_name: "sample.mp3",
			mime_type: "audio/mpeg",
			size_bytes: 1000000,
			hash: "1234567890",
		},
	],
	fine_tuning: {
		is_allowed_to_fine_tune: true,
		manual_verification_requested: false,
		state: { eleven_multilingual_v2: "fine_tuned" },
		verification_attempts_count: 2,
		verification_failures: [],
	},
	settings: {
		similarity_boost: 1,
		speed: 1,
		stability: 1,
		style: 0,
		use_speaker_boost: true,
	},
	sharing: {
		category: "professional",
		cloned_by_count: 50,
		date_unix: 1714204800,
		description: "A female voice with a soft and friendly tone.",
		disable_at_unix: 1714204800,
		enabled_in_library: true,
		featured: true,
		financial_rewards_enabled: true,
		free_users_allowed: true,
		history_item_sample_id: "DCwhRBWXzGAHq8TQ4Fs18",
		labels: { accent: "American", gender: "female" },
		liked_by_count: 100,
		live_moderation_enabled: true,
		moderation_check: {
			captcha_checks: [0.95, 0.98],
			captcha_ids: ["captcha1", "captcha2"],
			date_checked_unix: 1714204800,
			description_check: true,
			description_value: "A female voice with a soft and friendly tone.",
			name_check: true,
			name_value: "Rachel",
			sample_checks: [0.95, 0.98],
			sample_ids: ["sample1", "sample2"],
		},
		name: "Rachel",
		notice_period: 30,
		original_voice_id: "DCwhRBWXzGAHq8TQ4Fs18",
		public_owner_id: "DCwhRBWXzGAHq8TQ4Fs18",
		rate: 0.05,
		reader_app_enabled: true,
		reader_restricted_on: [
			{ resource_id: "FCwhRBWXzGAHq8TQ4Fs18", resource_type: "read" },
		],
		review_status: "allowed",
		status: "enabled",
		voice_mixing_allowed: false,
		whitelisted_emails: ["example@example.com"],
	},
	verified_languages: [
		{
			accent: "american",
			language: "en",
			locale: "en-US",
			model_id: "eleven_multilingual_v2",
			preview_url:
				"https://storage.googleapis.com/eleven-public-prod/premade/voices/9BWtsMINqrJLrRacOk9x/405766b8-1f4e-4d3c-aba1-6f25333823ec.mp3",
		},
	],
	voice_verification: {
		is_verified: true,
		language: "en",
		requires_verification: false,
		verification_attempts: [
			{
				accepted: true,
				date_unix: 1714204800,
				levenshtein_distance: 2,
				recording: {
					mime_type: "audio/mpeg",
					recording_id: "CwhRBWXzGAHq8TQ4Fs17",
					size_bytes: 1000000,
					transcription: "Hello, how are you?",
					upload_date_unix: 1714204800,
				},
				similarity: 0.95,
				text: "Hello, how are you?",
			},
		],
		verification_attempts_count: 0,
		verification_failures: [],
	},
	collection_ids: [],
	safety_control: "NONE",
	permission_on_resource: null,
	favorited_at_unix: null,
	created_at_unix: 1714204800,
	is_bookmarked: false,
	recording_quality: "studio",
	labelling_status: "labelled",
	recording_quality_reason: null,
};

const VOICE_LIST = {
	voices: [UPSTREAM_VOICE],
	has_more: false,
	total_count: 1,
	next_page_token: null,
};

/**
 * The ten properties the upstream's own OpenAPI document leaves out of its
 * `VoiceResponseModel` example.
 *
 * The document's example omits them, and its `GetVoicesResponseModel` example
 * carries only `voices`. They are therefore genuinely optional, and a schema
 * that requires them rejects the upstream's own documented payload — which,
 * now that the response is validated at the seam, is a 500 rather than a
 * quietly malformed answer.
 */
const PROPERTIES_THE_UPSTREAM_OMITS = [
	"samples",
	"collection_ids",
	"safety_control",
	"permission_on_resource",
	"favorited_at_unix",
	"created_at_unix",
	"is_bookmarked",
	"recording_quality",
	"labelling_status",
	"recording_quality_reason",
] as const;

/**
 * The upstream's documented voice, with the properties the upstream itself
 * omits left out.
 */
const UPSTREAM_VOICE_AS_DOCUMENTED = Object.fromEntries(
	Object.entries(UPSTREAM_VOICE).filter(
		([key]) =>
			!PROPERTIES_THE_UPSTREAM_OMITS.includes(
				key as (typeof PROPERTIES_THE_UPSTREAM_OMITS)[number]
			)
	)
);

describe("ElevenLabsListVoicesResponseSchema", () => {
	it("parses the voice exactly as the upstream documents it", () => {
		// The upstream's own OpenAPI example omits ten voice properties and
		// carries only `voices` on the response. Those properties are
		// optional, so the documented payload must parse as it stands.
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			voices: [UPSTREAM_VOICE_AS_DOCUMENTED],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		const voice = parsed.data.voices[0];
		expect(voice?.name).toBe("Rachel");
		expect(voice?.samples).toBeUndefined();
		expect(voice?.collection_ids).toBeUndefined();
		expect(voice?.safety_control).toBeUndefined();
		expect(voice?.recording_quality).toBeUndefined();
	});

	it("parses the status values the upstream actually sends", () => {
		// These are the upstream's own enum members. A schema that does not
		// know them rejects a real voice, and the response is then a 500.
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			voices: [
				{
					...UPSTREAM_VOICE_AS_DOCUMENTED,
					recording_quality: "good",
					labelling_status: "review_complete",
					safety_control: "ENTERPRISE_BAN",
					category: "high_quality",
				},
			],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		const voice = parsed.data.voices[0];
		expect(voice?.recording_quality).toBe("good");
		expect(voice?.labelling_status).toBe("review_complete");
		expect(voice?.safety_control).toBe("ENTERPRISE_BAN");
		expect(voice?.category).toBe("high_quality");
	});

	it("still rejects a status value that is not one of the upstream's", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			voices: [
				{
					...UPSTREAM_VOICE_AS_DOCUMENTED,
					recording_quality: "excellent",
				},
			],
		});

		expect(parsed.success).toBe(false);
	});

	it("parses the voice the upstream documents", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse(VOICE_LIST);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		const voice = parsed.data.voices[0];
		expect(voice?.samples?.[0]?.sample_id).toBe("DCwhRBWXzGAHq8TQ4Fs18");
		expect(voice?.fine_tuning?.state?.eleven_multilingual_v2).toBe(
			"fine_tuned"
		);
		expect(voice?.settings?.stability).toBe(1);
		expect(voice?.sharing?.status).toBe("enabled");
		expect(voice?.verified_languages?.[0]?.model_id).toBe(
			"eleven_multilingual_v2"
		);
		expect(
			voice?.voice_verification?.verification_attempts?.[0]?.text
		).toBe("Hello, how are you?");
	});

	it("rejects a setting that is not a number", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			...VOICE_LIST,
			voices: [{ ...UPSTREAM_VOICE, settings: { stability: "high" } }],
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects a verified language that is not a language", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			...VOICE_LIST,
			voices: [
				{
					...UPSTREAM_VOICE,
					verified_languages: [
						{ language: 42, model_id: "eleven_v2" },
					],
				},
			],
		});

		expect(parsed.success).toBe(false);
	});

	it("keeps the keys the upstream did not document", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			...VOICE_LIST,
			voices: [
				{
					...UPSTREAM_VOICE,
					settings: { stability: 1, brand_new_setting: "kept" },
				},
			],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		const settings = parsed.data.voices[0]?.settings as Record<
			string,
			unknown
		>;
		expect(settings.brand_new_setting).toBe("kept");
	});

	it("accepts a voice that belongs to no collection", () => {
		const parsed = ElevenLabsListVoicesResponseSchema.safeParse({
			...VOICE_LIST,
			voices: [
				{
					...UPSTREAM_VOICE,
					collection_ids: null,
					verified_languages: null,
				},
			],
		});

		expect(parsed.success).toBe(true);
	});
});

describe("MusicComposeDetailedResponseSchema", () => {
	const COMPOSITION = {
		audio: "YXVkaW8=",
		composition_plan: {
			positive_global_styles: ["pop"],
			negative_global_styles: ["metal"],
			sections: [],
		},
		song_metadata: {
			description: "My Song Description",
			genres: ["pop"],
			is_explicit: false,
			languages: ["en"],
			title: "My Song",
		},
	};

	it("parses the word timestamps the upstream documents", () => {
		const parsed = MusicComposeDetailedResponseSchema.safeParse({
			...COMPOSITION,
			words_timestamps: [
				{ word: "Verse", start_ms: 0, end_ms: 1000 },
				{ word: "1", start_ms: 1000, end_ms: 2000 },
			],
			waveform_visual: [0, -100, 250, 1000],
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.words_timestamps?.[0]?.word).toBe("Verse");
		expect(parsed.data.waveform_visual).toEqual([0, -100, 250, 1000]);
	});

	it("tolerates a song without timestamps", () => {
		const parsed =
			MusicComposeDetailedResponseSchema.safeParse(COMPOSITION);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.words_timestamps).toBeUndefined();
		expect(parsed.data.waveform_visual).toBeUndefined();
	});

	it("rejects a word timestamp that is not a timestamp", () => {
		const parsed = MusicComposeDetailedResponseSchema.safeParse({
			...COMPOSITION,
			words_timestamps: [{ word: "Verse", start_ms: "0", end_ms: 1000 }],
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects a waveform that is not a list of samples", () => {
		const parsed = MusicComposeDetailedResponseSchema.safeParse({
			...COMPOSITION,
			waveform_visual: "0,-100",
		});

		expect(parsed.success).toBe(false);
	});
});
