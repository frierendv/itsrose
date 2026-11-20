import type { VoiceAccessPort } from "@itsrose/api-routes/audio";
import { VoiceAccessDeniedError } from "@itsrose/api-routes/audio";
import {
	GenerationNotFoundError,
	type FindGenerationInput,
	type GenerationService,
	type ListGenerationsInput,
	type MarkGenerationSavedInput,
	type RecordGenerationInput,
	type RemoveGenerationInput,
} from "@itsrose/auth-resources/generations";
import type { Generation } from "@itsrose/auth-resources/types";
import {
	type AssetService,
	type PromoteAssetInput,
	type ReadAssetUrlInput,
} from "@itsrose/auth-storage/assets";
import type { AssetRecord } from "@itsrose/auth-storage/types";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type { AuthServer } from "@itsrose/auth/server";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import type {
	StudioPutGeneratedInput,
	StudioSpeechInput,
	StudioSpeechPort,
	StudioStorePort,
} from "../src/plugins/app/07-studio";
import apiResponsePlugin from "../src/plugins/openapi/api-response";
import studioRoutes from "../src/routes/studio";

/* -------------------------------------------------------------------------- */
/*                                  Fixtures                                  */
/* -------------------------------------------------------------------------- */

const USER_ID = "user-1";
const GENERATION_ID = "generation-1";
const ASSET_ID = "asset-1";
const VOICE_ID = "voice-1";
const TEXT = "Hello from the studio.";
const AUDIO = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
const CREATED_AT = new Date("2026-11-20T06:00:00.000Z");
const RECORDED_AT = new Date("2026-11-20T07:00:00.000Z");
/** A deadline far in the future: the live-result fixture never expires. */
const LIVE = new Date("2099-01-01T00:00:00.000Z");
/** A deadline far in the past: the expired fixture always has expired. */
const PAST = new Date("2020-01-01T00:00:00.000Z");
const RESULT_KEY = `t/users/${USER_ID}/generated/abc123`;

const ASSET_RECORD: AssetRecord = {
	asset_id: ASSET_ID,
	user_id: USER_ID,
	tenant_id: tenantIdForUser(USER_ID),
	kind: "audio",
	key: `assets/users/${USER_ID}/audio/${ASSET_ID}/speech.mp3`,
	filename: "speech.mp3",
	size_bytes: AUDIO.length,
	content_type: "audio/mpeg",
	status: "ready",
	created_at: CREATED_AT,
	deleted_at: null,
};

/**
 * One generation row, live and unsaved unless a test overrides it.
 */
function generation(overrides: Partial<Generation> = {}): Generation {
	return {
		generation_id: GENERATION_ID,
		tenant_id: tenantIdForUser(USER_ID),
		user_id: USER_ID,
		feature: "text_to_speech",
		provider: "elevenlabs",
		provider_task_id: null,
		status: "succeeded",
		input_text: "Hello.",
		input_params: JSON.stringify({ voice_id: VOICE_ID }),
		result_key: RESULT_KEY,
		result_content_type: "audio/mpeg",
		result_asset_id: null,
		expires_at: LIVE,
		created_at: CREATED_AT,
		deleted_at: null,
		...overrides,
	};
}

/* -------------------------------------------------------------------------- */
/*                                  Fakes                                     */
/* -------------------------------------------------------------------------- */

type GenerationCalls = {
	record: RecordGenerationInput[];
	list: ListGenerationsInput[];
	find: FindGenerationInput[];
	markSaved: MarkGenerationSavedInput[];
	remove: RemoveGenerationInput[];
};

type GenerationOptions = {
	/** The row `find` answers; `null` means the row does not exist. */
	row?: Generation | null;
	/** The rows `list` answers. */
	rows?: Generation[];
	/** The row `record` returns. */
	recorded?: Generation;
	/** Makes the ledger delete reject. */
	removeError?: Error;
	/** The shared event log, used to assert the delete order. */
	events?: string[];
};

/**
 * Builds the generation ledger over the recording fake the routes expect.
 */
function createGenerationService(options: GenerationOptions = {}): {
	service: GenerationService;
	calls: GenerationCalls;
} {
	const calls: GenerationCalls = {
		record: [],
		list: [],
		find: [],
		markSaved: [],
		remove: [],
	};

	const service: GenerationService = {
		async record(input) {
			calls.record.push(input);
			return options.recorded ?? generation();
		},
		async list(input) {
			calls.list.push(input);
			return options.rows ?? [generation()];
		},
		async find(input) {
			calls.find.push(input);
			if (options.row === null) {
				throw new GenerationNotFoundError(input.generationId);
			}
			return options.row ?? generation();
		},
		async markSaved(input) {
			calls.markSaved.push(input);
			return generation({ result_asset_id: input.assetId });
		},
		async remove(input) {
			calls.remove.push(input);
			options.events?.push("generation:remove");
			if (options.removeError) {
				throw options.removeError;
			}
			return generation({ deleted_at: CREATED_AT });
		},
		async deleteAllForUser() {
			return 0;
		},
	};

	return { service, calls };
}

type StoreCalls = {
	putGenerated: StudioPutGeneratedInput[];
	publicUrl: string[];
	remove: string[];
};

type StoreOptions = {
	/** The public URL `publicUrl` answers. */
	publicUrl?: string;
	/** Makes the object delete reject, e.g. when the bucket is unreachable. */
	removeError?: Error;
	/** The shared event log, used to assert the delete order. */
	events?: string[];
};

/**
 * Builds the generated-object store over a recording fake.
 */
function createStore(options: StoreOptions = {}): {
	store: StudioStorePort;
	calls: StoreCalls;
} {
	const calls: StoreCalls = {
		putGenerated: [],
		publicUrl: [],
		remove: [],
	};

	const store: StudioStorePort = {
		async putGenerated(input) {
			calls.putGenerated.push(input);
			return {
				key: RESULT_KEY,
				url: "https://cdn.test/generated.mp3",
			};
		},
		publicUrl(key) {
			calls.publicUrl.push(key);
			return options.publicUrl ?? "https://cdn.test/generated.mp3";
		},
		async remove(key) {
			calls.remove.push(key);
			options.events?.push("store:remove");
			if (options.removeError) {
				throw options.removeError;
			}
		},
	};

	return { store, calls };
}

type SpeechCalls = {
	generate: StudioSpeechInput[];
};

type SpeechOptions = {
	/** Makes synthesis reject. */
	error?: Error;
};

/**
 * Builds the speech port over a recording fake.
 */
function createSpeech(options: SpeechOptions = {}): {
	speech: StudioSpeechPort;
	calls: SpeechCalls;
} {
	const calls: SpeechCalls = { generate: [] };

	const speech: StudioSpeechPort = {
		async generate(input) {
			calls.generate.push(input);
			if (options.error) {
				throw options.error;
			}
			return { data: AUDIO, contentType: "audio/mpeg" };
		},
	};

	return { speech, calls };
}

type AssetCalls = {
	promote: PromoteAssetInput[];
	readUrl: ReadAssetUrlInput[];
};

type AssetOptions = {
	/** Makes the signed-URL read reject, e.g. with `AssetNotFoundError`. */
	readUrlError?: Error;
};

/**
 * Builds the asset service over the recording fake the routes expect.
 */
function createAssets(options: AssetOptions = {}): {
	assets: AssetService;
	calls: AssetCalls;
} {
	const calls: AssetCalls = { promote: [], readUrl: [] };

	const assets: AssetService = {
		async upload() {
			return ASSET_RECORD;
		},
		async promote(input) {
			calls.promote.push(input);
			return ASSET_RECORD;
		},
		async list() {
			return [ASSET_RECORD];
		},
		async readUrl(input) {
			calls.readUrl.push(input);
			if (options.readUrlError) {
				throw options.readUrlError;
			}
			return {
				url: "https://storage.test/signed?token=1",
				expires_in: 900,
			};
		},
		async remove() {
			return true;
		},
	};

	return { assets, calls };
}

/**
 * The voice ownership port, denying every synthesis when a denial is given.
 */
function createVoiceAccess(options: { denial?: Error } = {}): {
	voiceAccess: VoiceAccessPort;
	checked: Array<{ userId: string | null; voiceId: string }>;
} {
	const checked: Array<{ userId: string | null; voiceId: string }> = [];

	const assertCanUseVoice = async (
		request: FastifyRequest,
		voiceId: string
	): Promise<void> => {
		checked.push({ userId: request.userId, voiceId });
		if (options.denial) {
			throw options.denial;
		}
	};

	return {
		voiceAccess: belongsToVoiceAccess(assertCanUseVoice),
		checked,
	};
}

/**
 * Narrows the one method the route uses to the full port.
 *
 * The other operations are exercised by their own tests; the studio route
 * only ever calls `assertCanUseVoice`.
 */
function belongsToVoiceAccess(
	assertCanUseVoice: VoiceAccessPort["assertCanUseVoice"]
): VoiceAccessPort {
	return { assertCanUseVoice } as unknown as VoiceAccessPort;
}

/* -------------------------------------------------------------------------- */
/*                                   App                                      */
/* -------------------------------------------------------------------------- */

type BuildOptions = GenerationOptions &
	StoreOptions &
	SpeechOptions &
	AssetOptions & {
		/** `null` means the caller has no session; omitted means a valid one. */
		session?: { user: { id: string } } | null;
		/** Makes the voice ownership check deny. */
		voiceDenial?: Error;
	};

type BuiltApp = {
	app: FastifyInstance;
	sessionInputs: unknown[];
	voiceChecked: Array<{ userId: string | null; voiceId: string }>;
	generationCalls: GenerationCalls;
	storeCalls: StoreCalls;
	speechCalls: SpeechCalls;
	assetCalls: AssetCalls;
};

/**
 * Builds a bare app with the Zod compilers, a fake session server, the fake
 * ports the studio routes call and the shared error handler.
 */
async function buildApp(options: BuildOptions = {}): Promise<BuiltApp> {
	const session =
		options.session === undefined
			? { user: { id: USER_ID } }
			: options.session;
	const sessionInputs: unknown[] = [];

	const auth = {
		api: {
			async getSession(input: unknown) {
				sessionInputs.push(input);
				return session;
			},
		},
	} as unknown as AuthServer;

	const events = options.events ?? [];
	const { service: generationService, calls: generationCalls } =
		createGenerationService({ ...options, events });
	const { store, calls: storeCalls } = createStore({ ...options, events });
	const { speech, calls: speechCalls } = createSpeech(options);
	const { voiceAccess, checked: voiceChecked } = createVoiceAccess({
		denial: options.voiceDenial,
	});
	const { assets, calls: assetCalls } = createAssets(options);

	const app = Fastify();
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	app.decorate("auth", auth);
	app.decorate("voiceAccess", voiceAccess);
	app.decorate("studioSpeech", speech);
	app.decorate("studioStore", store);
	app.decorate("generationService", generationService);
	app.decorate("assetService", assets);

	await app.register(apiResponsePlugin);
	await app.register(studioRoutes);
	await app.ready();

	return {
		app,
		sessionInputs,
		voiceChecked,
		generationCalls,
		storeCalls,
		speechCalls,
		assetCalls,
	};
}

/* -------------------------------------------------------------------------- */
/*                                   Tests                                    */
/* -------------------------------------------------------------------------- */

describe("the studio session guard", () => {
	const ROUTES = [
		{
			method: "POST",
			url: "/studio/speech",
			payload: { text: TEXT, voice_id: VOICE_ID },
		},
		{ method: "GET", url: "/studio/generations", payload: undefined },
		{
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
			payload: undefined,
		},
		{
			method: "POST",
			url: `/studio/generations/${GENERATION_ID}/save`,
			payload: {},
		},
		{
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
			payload: undefined,
		},
	] as const;

	it.each(ROUTES)(
		"answers 401 for $method $url without a session, whatever API credential is sent",
		async ({ method, url, payload }) => {
			const built = await buildApp({ session: null });

			const response = await built.app.inject({
				method,
				url,
				payload,
				headers: {
					authorization: "Bearer api-key",
					"x-auth-token": "true",
				},
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({
				ok: false,
				code: 2101,
				data: null,
				errors: { session: "Sign in to the dashboard and retry." },
			});
			expect(built.speechCalls.generate).toEqual([]);
			expect(built.storeCalls.putGenerated).toEqual([]);
			expect(built.generationCalls.find).toEqual([]);
			expect(built.generationCalls.list).toEqual([]);
			expect(built.generationCalls.remove).toEqual([]);

			await built.app.close();
		}
	);
});

describe("POST /studio/speech", () => {
	it("synthesises, stores and records the generation", async () => {
		const built = await buildApp({
			recorded: generation({ expires_at: RECORDED_AT }),
		});

		const response = await built.app.inject({
			method: "POST",
			url: "/studio/speech",
			payload: {
				text: TEXT,
				voice_id: VOICE_ID,
				model_id: "eleven_multilingual_v2",
				output_format: "mp3_44100_128",
			},
			headers: { cookie: "better-auth.session_token=test" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			generation_id: GENERATION_ID,
			audio_url: "https://cdn.test/generated.mp3",
			expires_at: RECORDED_AT.toISOString(),
			saved: false,
		});

		// The ownership check runs under the session user, before the
		// provider call.
		expect(built.voiceChecked).toEqual([
			{ userId: USER_ID, voiceId: VOICE_ID },
		]);
		expect(built.speechCalls.generate).toEqual([
			{
				text: TEXT,
				voice_id: VOICE_ID,
				model_id: "eleven_multilingual_v2",
				output_format: "mp3_44100_128",
			},
		]);
		expect(built.storeCalls.putGenerated).toEqual([
			{ userId: USER_ID, data: AUDIO, contentType: "audio/mpeg" },
		]);
		expect(built.generationCalls.record).toEqual([
			{
				userId: USER_ID,
				tenantId: tenantIdForUser(USER_ID),
				feature: "text_to_speech",
				provider: "elevenlabs",
				inputText: TEXT,
				inputParams: JSON.stringify({
					voice_id: VOICE_ID,
					model_id: "eleven_multilingual_v2",
					output_format: "mp3_44100_128",
				}),
				resultKey: RESULT_KEY,
				resultContentType: "audio/mpeg",
			},
		]);
		expect(built.sessionInputs).toHaveLength(1);

		await built.app.close();
	});

	it("records the invocation context even without optional parameters", async () => {
		const built = await buildApp();

		const response = await built.app.inject({
			method: "POST",
			url: "/studio/speech",
			payload: { text: TEXT, voice_id: VOICE_ID },
		});

		expect(response.statusCode).toBe(200);
		const recorded = built.generationCalls.record[0];
		expect(recorded?.inputParams).toBe(
			JSON.stringify({
				voice_id: VOICE_ID,
				model_id: undefined,
				output_format: undefined,
			})
		);

		await built.app.close();
	});

	it("maps a denied voice to 404 without calling the provider", async () => {
		const built = await buildApp({
			voiceDenial: new VoiceAccessDeniedError("voice-foreign"),
		});

		const response = await built.app.inject({
			method: "POST",
			url: "/studio/speech",
			payload: { text: TEXT, voice_id: "voice-foreign" },
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2301,
			errors: { voice_id: "voice-foreign" },
		});
		expect(built.speechCalls.generate).toEqual([]);
		expect(built.storeCalls.putGenerated).toEqual([]);
		expect(built.generationCalls.record).toEqual([]);

		await built.app.close();
	});

	it("rejects text the schema caps before any port is called", async () => {
		const built = await buildApp();

		const response = await built.app.inject({
			method: "POST",
			url: "/studio/speech",
			payload: { text: "a".repeat(5001), voice_id: VOICE_ID },
		});

		expect(response.statusCode).toBe(400);
		expect(built.voiceChecked).toEqual([]);
		expect(built.speechCalls.generate).toEqual([]);

		await built.app.close();
	});
});

describe("GET /studio/generations", () => {
	it("maps every history state and derives `expired`", async () => {
		const saved = generation({
			result_asset_id: ASSET_ID,
			expires_at: PAST,
		});
		const live = generation({
			generation_id: "generation-2",
			expires_at: LIVE,
		});
		const expired = generation({
			generation_id: "generation-3",
			expires_at: PAST,
		});
		const unstored = generation({
			generation_id: "generation-4",
			result_key: null,
			expires_at: null,
		});
		const built = await buildApp({
			rows: [saved, live, expired, unstored],
		});

		const response = await built.app.inject({
			method: "GET",
			url: "/studio/generations",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			items: [
				{
					generation_id: GENERATION_ID,
					feature: "text_to_speech",
					status: "succeeded",
					input_text: "Hello.",
					created_at: CREATED_AT.toISOString(),
					expires_at: PAST.toISOString(),
					saved: true,
					asset_id: ASSET_ID,
					// A saved result answers through its durable asset, so
					// it never reads as expired.
					expired: false,
				},
				{
					generation_id: "generation-2",
					feature: "text_to_speech",
					status: "succeeded",
					input_text: "Hello.",
					created_at: CREATED_AT.toISOString(),
					expires_at: LIVE.toISOString(),
					saved: false,
					asset_id: null,
					expired: false,
				},
				{
					generation_id: "generation-3",
					feature: "text_to_speech",
					status: "succeeded",
					input_text: "Hello.",
					created_at: CREATED_AT.toISOString(),
					expires_at: PAST.toISOString(),
					saved: false,
					asset_id: null,
					expired: true,
				},
				{
					generation_id: "generation-4",
					feature: "text_to_speech",
					status: "succeeded",
					input_text: "Hello.",
					created_at: CREATED_AT.toISOString(),
					expires_at: null,
					saved: false,
					asset_id: null,
					// A row that never stored a result has nothing to expire.
					expired: false,
				},
			],
			limit: 20,
			offset: 0,
		});
		expect(built.generationCalls.list).toEqual([
			{ userId: USER_ID, feature: undefined, limit: 20, offset: 0 },
		]);

		await built.app.close();
	});

	it("passes an explicit feature filter and window through", async () => {
		const built = await buildApp({ rows: [] });

		const response = await built.app.inject({
			method: "GET",
			url: "/studio/generations?feature=text_to_speech&limit=5&offset=10",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ items: [], limit: 5, offset: 10 });
		expect(built.generationCalls.list).toEqual([
			{
				userId: USER_ID,
				feature: "text_to_speech",
				limit: 5,
				offset: 10,
			},
		]);

		await built.app.close();
	});

	it("rejects a feature outside the closed union", async () => {
		const built = await buildApp();

		const response = await built.app.inject({
			method: "GET",
			url: "/studio/generations?feature=not-a-feature",
		});

		expect(response.statusCode).toBe(400);
		expect(built.generationCalls.list).toEqual([]);

		await built.app.close();
	});
});

describe("GET /studio/generations/:generation_id/url", () => {
	it("mints the library's signed URL for a saved result", async () => {
		const built = await buildApp({
			row: generation({ result_asset_id: ASSET_ID }),
		});

		const response = await built.app.inject({
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			url: "https://storage.test/signed?token=1",
			expires_in: 900,
			source: "library",
		});
		expect(built.assetCalls.readUrl).toEqual([
			{ userId: USER_ID, assetId: ASSET_ID },
		]);
		expect(built.storeCalls.publicUrl).toEqual([]);

		await built.app.close();
	});

	it("returns the generated public URL while the object lives", async () => {
		const built = await buildApp({
			row: generation({ expires_at: new Date(Date.now() + 3_600_000) }),
		});

		const response = await built.app.inject({
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
		});

		expect(response.statusCode).toBe(200);
		const body = response.json() as {
			url: string;
			expires_in: number;
			source: string;
		};
		expect(body.url).toBe("https://cdn.test/generated.mp3");
		expect(body.source).toBe("generated");
		expect(body.expires_in).toBeGreaterThan(0);
		expect(body.expires_in).toBeLessThanOrEqual(3600);
		expect(built.storeCalls.publicUrl).toEqual([RESULT_KEY]);

		await built.app.close();
	});

	it("maps an expired result to 410 GONE", async () => {
		const built = await buildApp({
			row: generation({ expires_at: PAST }),
		});

		const response = await built.app.inject({
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
		});

		expect(response.statusCode).toBe(410);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2354,
			errors: { generation_id: GENERATION_ID },
		});
		expect(built.storeCalls.publicUrl).toEqual([]);

		await built.app.close();
	});

	it("maps a missing or foreign row to 404 without saying which", async () => {
		const built = await buildApp({ row: null });

		const response = await built.app.inject({
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
		});

		expect(response.statusCode).toBe(404);
		const body = response.json() as { message: string };
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2301,
			errors: { generation_id: GENERATION_ID },
		});
		expect(body.message).not.toMatch(/owner|another|foreign|forbidden/i);

		await built.app.close();
	});

	it("maps a row that never stored a result to 404", async () => {
		const built = await buildApp({
			row: generation({ result_key: null, expires_at: null }),
		});

		const response = await built.app.inject({
			method: "GET",
			url: `/studio/generations/${GENERATION_ID}/url`,
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({ ok: false, code: 2301 });
		expect(built.storeCalls.publicUrl).toEqual([]);

		await built.app.close();
	});
});

describe("POST /studio/generations/:generation_id/save", () => {
	it("promotes the generated object and links the durable asset", async () => {
		const built = await buildApp();

		const response = await built.app.inject({
			method: "POST",
			url: `/studio/generations/${GENERATION_ID}/save`,
			payload: {},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ asset_id: ASSET_ID, saved: true });
		expect(built.assetCalls.promote).toEqual([
			{
				userId: USER_ID,
				tenantId: tenantIdForUser(USER_ID),
				kind: "audio",
				// The default name comes from the generation id and the
				// recorded content type, not from the caller.
				filename: `${GENERATION_ID}.mp3`,
				sourceKey: RESULT_KEY,
			},
		]);
		expect(built.generationCalls.markSaved).toEqual([
			{ userId: USER_ID, generationId: GENERATION_ID, assetId: ASSET_ID },
		]);

		await built.app.close();
	});

	it("uses the caller's filename when one is given", async () => {
		const built = await buildApp();

		const response = await built.app.inject({
			method: "POST",
			url: `/studio/generations/${GENERATION_ID}/save`,
			payload: { filename: "narration.mp3" },
		});

		expect(response.statusCode).toBe(200);
		expect(built.assetCalls.promote[0]?.filename).toBe("narration.mp3");

		await built.app.close();
	});

	it("is idempotent: a second save answers with the same asset", async () => {
		const built = await buildApp({
			row: generation({ result_asset_id: ASSET_ID }),
		});

		const response = await built.app.inject({
			method: "POST",
			url: `/studio/generations/${GENERATION_ID}/save`,
			payload: {},
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			asset_id: ASSET_ID,
			saved: true,
			already_saved: true,
		});
		expect(built.assetCalls.promote).toEqual([]);
		expect(built.generationCalls.markSaved).toEqual([]);

		await built.app.close();
	});

	it("maps an expired result to 410 instead of promoting it", async () => {
		const built = await buildApp({
			row: generation({ expires_at: PAST }),
		});

		const response = await built.app.inject({
			method: "POST",
			url: `/studio/generations/${GENERATION_ID}/save`,
			payload: {},
		});

		expect(response.statusCode).toBe(410);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2354,
			errors: { generation_id: GENERATION_ID },
		});
		expect(built.assetCalls.promote).toEqual([]);
		expect(built.generationCalls.markSaved).toEqual([]);

		await built.app.close();
	});
});

describe("DELETE /studio/generations/:generation_id", () => {
	it("removes the ephemeral object before the row", async () => {
		const events: string[] = [];
		const built = await buildApp({ events });

		const response = await built.app.inject({
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ deleted: true });
		expect(built.storeCalls.remove).toEqual([RESULT_KEY]);
		expect(built.generationCalls.remove).toEqual([
			{ userId: USER_ID, generationId: GENERATION_ID },
		]);
		// The row is the retry manifest, so it must survive a failed object
		// delete: the object goes first.
		expect(events).toEqual(["store:remove", "generation:remove"]);

		await built.app.close();
	});

	it("keeps the row when the object delete fails", async () => {
		const built = await buildApp({
			removeError: new Error("bucket unavailable"),
		});

		const response = await built.app.inject({
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
		});

		expect(response.statusCode).toBe(500);
		expect(built.generationCalls.remove).toEqual([]);

		await built.app.close();
	});

	it("clears only the row of a saved result; the library copy stays", async () => {
		const events: string[] = [];
		const built = await buildApp({
			events,
			row: generation({ result_asset_id: ASSET_ID }),
		});

		const response = await built.app.inject({
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({ deleted: true });
		expect(built.storeCalls.remove).toEqual([]);
		expect(built.generationCalls.remove).toEqual([
			{ userId: USER_ID, generationId: GENERATION_ID },
		]);
		expect(events).toEqual(["generation:remove"]);

		await built.app.close();
	});

	it("clears a row that never stored a result", async () => {
		const built = await buildApp({
			row: generation({ result_key: null, expires_at: null }),
		});

		const response = await built.app.inject({
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
		});

		expect(response.statusCode).toBe(200);
		expect(built.storeCalls.remove).toEqual([]);
		expect(built.generationCalls.remove).toHaveLength(1);

		await built.app.close();
	});

	it("maps a missing or foreign row to 404", async () => {
		const built = await buildApp({ row: null });

		const response = await built.app.inject({
			method: "DELETE",
			url: `/studio/generations/${GENERATION_ID}`,
		});

		expect(response.statusCode).toBe(404);
		expect(built.storeCalls.remove).toEqual([]);
		expect(built.generationCalls.remove).toEqual([]);

		await built.app.close();
	});
});
