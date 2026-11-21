import { parseEnvelope } from "@/lib/api/envelope";
import {
	generateSpeechInputSchema,
	generateSpeechResponseSchema,
	GENERATION_FEATURES,
	generationFeatureSchema,
	generationItemSchema,
	generationListSchema,
	generationUrlSchema,
	saveGenerationInputSchema,
	saveGenerationResponseSchema,
} from "../types";

const GENERATION = {
	generation_id: "gen_01",
	feature: "text_to_speech",
	status: "completed",
	input_text: "Hello there.",
	created_at: "2026-11-20T08:00:00.000Z",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
	asset_id: null,
	expired: false,
} as const;

const SPEECH = {
	generation_id: "gen_01",
	audio_url: "https://r2.example/generated/gen_01.mp3",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
};

function successEnvelope(data: unknown) {
	return {
		ok: true,
		code: 1000,
		message: "OK",
		data,
		errors: null,
		meta: {},
	};
}

function failureEnvelope() {
	return {
		ok: false,
		code: 4001,
		message: "A dashboard session is required to use the speech surface.",
		data: null,
		errors: { session: "Sign in and retry." },
		meta: {},
	};
}

describe("generation features", () => {
	it("mirrors the server's closed feature union", () => {
		expect(GENERATION_FEATURES).toEqual([
			"text_to_speech",
			"text_to_speech_with_timestamps",
			"speech_to_speech",
			"text_to_dialogue",
			"music_compose",
		]);
	});

	it("parses every known feature and rejects an unknown one", () => {
		for (const feature of GENERATION_FEATURES) {
			expect(generationFeatureSchema.parse(feature)).toBe(feature);
		}

		expect(generationFeatureSchema.safeParse("video_render").success).toBe(
			false
		);
	});
});

describe("request schemas", () => {
	it("accepts a speech request with the provider defaults omitted", () => {
		const input = generateSpeechInputSchema.parse({
			text: "Hello there.",
			voice_id: "voice_01",
		});

		expect(input).toEqual({
			text: "Hello there.",
			voice_id: "voice_01",
		});
	});

	it("enforces the server's text bound and required voice", () => {
		expect(
			generateSpeechInputSchema.safeParse({
				text: "",
				voice_id: "voice_01",
			}).success
		).toBe(false);
		expect(
			generateSpeechInputSchema.safeParse({
				text: "x".repeat(5001),
				voice_id: "voice_01",
			}).success
		).toBe(false);
		expect(
			generateSpeechInputSchema.safeParse({
				text: "Hello.",
				voice_id: "",
			}).success
		).toBe(false);
	});

	it("accepts a save body with or without a filename", () => {
		expect(saveGenerationInputSchema.parse({})).toEqual({});
		expect(
			saveGenerationInputSchema.parse({ filename: "clip.mp3" })
		).toEqual({ filename: "clip.mp3" });
		expect(
			saveGenerationInputSchema.safeParse({ filename: "" }).success
		).toBe(false);
	});
});

describe("wire schemas", () => {
	it("parses the speech response with snake_case fields", () => {
		const response = generateSpeechResponseSchema.parse(SPEECH);

		expect(response).toEqual(SPEECH);
		expect(Object.keys(response).sort()).toEqual([
			"audio_url",
			"expires_at",
			"generation_id",
			"saved",
		]);
	});

	it("parses a generation row, keeping nullable columns nullable", () => {
		const item = generationItemSchema.parse(GENERATION);

		expect(item).toEqual(GENERATION);
		expect(Object.keys(item).sort()).toEqual([
			"asset_id",
			"created_at",
			"expired",
			"expires_at",
			"feature",
			"generation_id",
			"input_text",
			"saved",
			"status",
		]);

		expect(
			generationItemSchema.safeParse({ ...GENERATION, input_text: 42 })
				.success
		).toBe(false);
	});

	it("parses a page of generations", () => {
		const page = generationListSchema.parse({
			items: [GENERATION],
			limit: 20,
			offset: 40,
		});

		expect(page.items).toHaveLength(1);
		expect(page.limit).toBe(20);
		expect(page.offset).toBe(40);
		expect(
			generationListSchema.safeParse({
				items: [],
				limit: -1,
				offset: 0,
			}).success
		).toBe(false);
	});

	it("parses a generation URL and rejects an unknown source", () => {
		expect(
			generationUrlSchema.parse({
				url: "https://r2.example/x",
				expires_in: 900,
				source: "library",
			})
		).toEqual({
			url: "https://r2.example/x",
			expires_in: 900,
			source: "library",
		});
		expect(
			generationUrlSchema.safeParse({
				url: "https://r2.example/x",
				expires_in: 900,
				source: "cache",
			}).success
		).toBe(false);
	});

	it("parses a save acknowledgement with and without already_saved", () => {
		expect(
			saveGenerationResponseSchema.parse({
				asset_id: "ast_01",
				saved: true,
				already_saved: true,
			})
		).toEqual({
			asset_id: "ast_01",
			saved: true,
			already_saved: true,
		});
		expect(
			saveGenerationResponseSchema.parse({
				asset_id: "ast_01",
				saved: true,
			})
		).toEqual({ asset_id: "ast_01", saved: true });
	});
});

describe("generation envelopes", () => {
	it("parses a success envelope around a generation page", () => {
		const envelope = parseEnvelope(
			generationListSchema,
			successEnvelope({ items: [GENERATION], limit: 20, offset: 0 })
		);

		expect(envelope.ok).toBe(true);
		if (!envelope.ok) {
			throw new Error("expected a success envelope");
		}
		expect(envelope.data.items).toHaveLength(1);
	});

	it("keeps a failure envelope as data", () => {
		const envelope = parseEnvelope(
			generationListSchema,
			failureEnvelope(),
			{
				status: 401,
			}
		);

		expect(envelope.ok).toBe(false);
		if (envelope.ok) {
			throw new Error("expected a failure envelope");
		}
		expect(envelope.code).toBe(4001);
		expect(envelope.errors).toEqual({ session: "Sign in and retry." });
	});

	it("rejects a success envelope whose history row is malformed", () => {
		expect(() =>
			parseEnvelope(
				generationListSchema,
				successEnvelope({
					items: [GENERATION],
					limit: "20",
					offset: 0,
				})
			)
		).toThrow(/does not match its schema/);
	});
});
