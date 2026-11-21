import { parseEnvelope } from "@/lib/api/envelope";
import {
	createVoiceInputSchema,
	createVoiceResponseSchema,
	deleteVoiceSchema,
	voiceListSchema,
	voiceSchema,
} from "../types";

const CLONED = {
	voice_id: "voice_01",
	name: "Narrator",
	source: "cloned",
	resource_id: "res_01",
	sample_asset_id: "ast_01",
	created_at: "2026-11-20T08:00:00.000Z",
} as const;

const PREMADE = {
	voice_id: "voice_premade_01",
	name: "Aria",
	source: "premade",
	preview_url: "https://storage.test/preview/aria.mp3",
} as const;

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
		message: "A dashboard session is required to use the voice library.",
		data: null,
		errors: { session: "Sign in and retry." },
		meta: {},
	};
}

describe("voiceSchema", () => {
	it("parses a cloned voice and keeps nullable columns nullable", () => {
		const voice = voiceSchema.parse(CLONED);

		expect(voice).toEqual(CLONED);
		expect(voice.source).toBe("cloned");
		if (voice.source !== "cloned") {
			throw new Error("expected a cloned voice");
		}
		expect(Object.keys(voice).sort()).toEqual([
			"created_at",
			"name",
			"resource_id",
			"sample_asset_id",
			"source",
			"voice_id",
		]);

		expect(
			voiceSchema.parse({ ...CLONED, sample_asset_id: null })
		).toMatchObject({ sample_asset_id: null });
	});

	it("parses a premade voice without an application id", () => {
		const voice = voiceSchema.parse(PREMADE);

		expect(voice).toEqual(PREMADE);
		expect(voice.source).toBe("premade");
		expect(Object.keys(voice).sort()).toEqual([
			"name",
			"preview_url",
			"source",
			"voice_id",
		]);

		// The catalogue omits `preview_url` when a premade voice has no
		// preview, so the field is optional as well as nullable.
		expect(
			voiceSchema.parse({ ...PREMADE, preview_url: null })
		).toMatchObject({ preview_url: null });
		expect(
			voiceSchema.parse({
				voice_id: "voice_premade_02",
				name: "Adam",
				source: "premade",
			})
		).toEqual({
			voice_id: "voice_premade_02",
			name: "Adam",
			source: "premade",
		});
	});

	it("requires resource_id on a cloned voice", () => {
		const withoutResource = {
			voice_id: "voice_01",
			name: "Narrator",
			source: "cloned",
			sample_asset_id: "ast_01",
			created_at: "2026-11-20T08:00:00.000Z",
		};

		expect(voiceSchema.safeParse(withoutResource).success).toBe(false);
	});

	it("rejects an unknown source", () => {
		expect(
			voiceSchema.safeParse({ ...PREMADE, source: "generated" }).success
		).toBe(false);
	});

	it("parses a mixed library", () => {
		const list = voiceListSchema.parse({
			items: [CLONED, PREMADE],
		});

		expect(list.items.map((item) => item.source)).toEqual([
			"cloned",
			"premade",
		]);
	});
});

describe("request schemas", () => {
	it("accepts a clone request with and without a description", () => {
		expect(
			createVoiceInputSchema.parse({
				asset_id: "ast_01",
				name: "Narrator",
			})
		).toEqual({ asset_id: "ast_01", name: "Narrator" });
		expect(
			createVoiceInputSchema.parse({
				asset_id: "ast_01",
				name: "Narrator",
				description: "Calm narration.",
			})
		).toEqual({
			asset_id: "ast_01",
			name: "Narrator",
			description: "Calm narration.",
		});
	});

	it("enforces the server's name and asset bounds", () => {
		expect(
			createVoiceInputSchema.safeParse({ asset_id: "", name: "Narrator" })
				.success
		).toBe(false);
		expect(
			createVoiceInputSchema.safeParse({
				asset_id: "ast_01",
				name: "x".repeat(101),
			}).success
		).toBe(false);
	});
});

describe("wire schemas", () => {
	it("parses the create acknowledgement", () => {
		const response = createVoiceResponseSchema.parse({
			resource_id: "res_01",
			voice_id: "voice_01",
			name: "Narrator",
			sample_asset_id: "ast_01",
		});

		expect(response).toEqual({
			resource_id: "res_01",
			voice_id: "voice_01",
			name: "Narrator",
			sample_asset_id: "ast_01",
		});
	});

	it("parses the delete acknowledgement", () => {
		expect(deleteVoiceSchema.parse({ deleted: true })).toEqual({
			deleted: true,
		});
		expect(deleteVoiceSchema.safeParse({ deleted: "true" }).success).toBe(
			false
		);
	});
});

describe("voice envelopes", () => {
	it("parses a success envelope around the voice library", () => {
		const envelope = parseEnvelope(
			voiceListSchema,
			successEnvelope({ items: [CLONED, PREMADE] })
		);

		expect(envelope.ok).toBe(true);
		if (!envelope.ok) {
			throw new Error("expected a success envelope");
		}
		expect(envelope.data.items).toHaveLength(2);
	});

	it("keeps a failure envelope as data", () => {
		const envelope = parseEnvelope(voiceListSchema, failureEnvelope(), {
			status: 401,
		});

		expect(envelope.ok).toBe(false);
		if (envelope.ok) {
			throw new Error("expected a failure envelope");
		}
		expect(envelope.code).toBe(4001);
		expect(envelope.errors).toEqual({ session: "Sign in and retry." });
	});
});
