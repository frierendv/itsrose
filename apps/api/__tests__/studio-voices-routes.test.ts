import type { VoiceAccessPort } from "@itsrose/api-routes/audio";
import type { ProviderResource } from "@itsrose/auth-resources/types";
import {
	VoiceConflictError,
	type ListVoicesInput,
	type RecordVoiceInput,
	type VoiceService,
} from "@itsrose/auth-resources/voices";
import {
	AssetNotFoundError,
	type AssetService,
	type ReadAssetUrlInput,
} from "@itsrose/auth-storage/assets";
import { tenantIdForUser } from "@itsrose/auth-usage/server";
import type { AuthServer } from "@itsrose/auth/server";
import type {
	IElevenLabsListVoices,
	IElevenLabsListVoicesResponse,
} from "@itsrose/elevenlabs";
import { ThirdPartyApiError } from "@itsrose/system";
import Fastify, { type FastifyInstance } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import type { Voice } from "../src/lib/voice-catalog";
import type {
	VoiceClonerInput,
	VoiceClonerPort,
} from "../src/plugins/app/06-voices";
import apiResponsePlugin from "../src/plugins/openapi/api-response";
import swaggerPlugin from "../src/plugins/openapi/swagger";
import studioVoicesRoutes from "../src/routes/studio-voices";

const USER_ID = "user-1";
const ASSET_ID = "asset-1";
const SIGNED_URL = "https://storage.test/signed?token=1";
const CREATED_AT = new Date("2026-11-20T00:00:00.000Z");

const FIRST_RECORD: ProviderResource = {
	resource_id: "resource-1",
	provider: "elevenlabs",
	provider_resource_id: "voice-1",
	tenant_id: "tenant-1",
	user_id: USER_ID,
	kind: "voice",
	name: "Narrator",
	sample_asset_id: ASSET_ID,
	status: "active",
	created_at: CREATED_AT,
	deleted_at: null,
};

const SECOND_RECORD: ProviderResource = {
	resource_id: "resource-2",
	provider: "elevenlabs",
	provider_resource_id: "voice-2",
	tenant_id: "tenant-1",
	user_id: USER_ID,
	kind: "voice",
	name: "Announcer",
	sample_asset_id: null,
	status: "active",
	created_at: new Date("2026-11-19T00:00:00.000Z"),
	deleted_at: null,
};

const NEW_RECORD: ProviderResource = {
	resource_id: "resource-new",
	provider: "elevenlabs",
	provider_resource_id: "voice-new",
	tenant_id: "tenant-1",
	user_id: USER_ID,
	kind: "voice",
	name: "Narrator",
	sample_asset_id: ASSET_ID,
	status: "active",
	created_at: CREATED_AT,
	deleted_at: null,
};

/**
 * Builds one upstream catalogue entry.
 *
 * Every required field the schema documents is present and nullable ones are
 * `null`, so the fixture is the shape the ownership port really returns
 * rather than a partial object cast into it.
 */
function catalogueVoice(input: {
	voice_id: string;
	name: string;
	category: "premade" | "cloned";
}): Voice {
	return {
		voice_id: input.voice_id,
		name: input.name,
		category: input.category,
		labels: {},
		description: null,
		preview_url: null,
		available_for_tiers: [],
		fine_tuning: null,
		settings: null,
		sharing: null,
		high_quality_base_model_ids: [],
		verified_languages: null,
		voice_verification: null,
		is_owner: false,
		is_legacy: false,
		is_mixed: false,
	};
}

type AssetCalls = {
	readUrl: ReadAssetUrlInput[];
};

type ClonerCalls = {
	create: VoiceClonerInput[];
	remove: string[];
};

type VoiceCalls = {
	list: ListVoicesInput[];
	record: RecordVoiceInput[];
};

type AccessCalls = {
	visible: IElevenLabsListVoices[];
};

type Calls = {
	asset: AssetCalls;
	cloner: ClonerCalls;
	voice: VoiceCalls;
	access: AccessCalls;
};

type BuildOptions = {
	/** `null` means the caller has no session; omitted means a valid one. */
	session?: { user: { id: string } } | null;
	/** The catalogue the ownership port answers with. */
	visible?: Voice[];
	/** The caller's live ledger rows, newest first. */
	owned?: ProviderResource[];
	readUrlError?: Error;
	createError?: Error;
	removeError?: Error;
	recordError?: Error;
};

type BuiltApp = {
	app: FastifyInstance;
	calls: Calls;
	sessionInputs: unknown[];
};

/**
 * Builds a bare app with the Zod compilers, a fake session server and the
 * fake ports the studio voice routes call.
 *
 * Every port answer is canned; the calls are what the routes are asserted on.
 */
async function buildApp(options: BuildOptions = {}): Promise<BuiltApp> {
	const calls: Calls = {
		asset: { readUrl: [] },
		cloner: { create: [], remove: [] },
		voice: { list: [], record: [] },
		access: { visible: [] },
	};

	const session =
		options.session === undefined
			? { user: { id: USER_ID } }
			: options.session;
	const sessionInputs: unknown[] = [];

	const assetService: AssetService = {
		async upload() {
			throw new Error("upload is not used by the voice library.");
		},
		async promote() {
			throw new Error("promote is not used by the voice library.");
		},
		async list() {
			throw new Error("list is not used by the voice library.");
		},
		async readUrl(input) {
			calls.asset.readUrl.push(input);
			if (options.readUrlError) {
				throw options.readUrlError;
			}
			return { url: SIGNED_URL, expires_in: 900 };
		},
		async remove() {
			throw new Error("remove is not used by the voice library.");
		},
	};

	const voiceCloner: VoiceClonerPort = {
		async create(input) {
			calls.cloner.create.push(input);
			if (options.createError) {
				throw options.createError;
			}
			return {
				voice_id: NEW_RECORD.provider_resource_id,
				name: input.name,
			};
		},
		async remove(voiceId) {
			calls.cloner.remove.push(voiceId);
			if (options.removeError) {
				throw options.removeError;
			}
		},
	};

	const voiceService: VoiceService = {
		async record(input) {
			calls.voice.record.push(input);
			if (options.recordError) {
				throw options.recordError;
			}
			return NEW_RECORD;
		},
		async list(input) {
			calls.voice.list.push(input);
			return options.owned ?? [FIRST_RECORD, SECOND_RECORD];
		},
		async remove() {
			throw new Error("remove is not used by the voice library.");
		},
		async removeAllForUser() {
			return { deleted: 0, failed: [] };
		},
	};

	const voiceAccess: VoiceAccessPort = {
		async listOwnedVoiceIds() {
			return [];
		},
		async listVisibleVoices(_request, query) {
			calls.access.visible.push(query);
			const voices = options.visible ?? [];
			const response: IElevenLabsListVoicesResponse = {
				voices,
				has_more: false,
				next_page_token: null,
				total_count: voices.length,
			};
			return response;
		},
		async assertCanUseVoice() {},
		async recordClonedVoice() {},
		async deleteOwnedVoice() {},
	};

	const app = Fastify();
	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	const auth = {
		api: {
			async getSession(input: unknown) {
				sessionInputs.push(input);
				return session;
			},
		},
	} as unknown as AuthServer;

	app.decorate("auth", auth);
	app.decorate("assetService", assetService);
	app.decorate("voiceCloner", voiceCloner);
	app.decorate("voiceService", voiceService);
	app.decorate("voiceAccess", voiceAccess);

	await app.register(apiResponsePlugin);
	await app.register(studioVoicesRoutes);
	await app.ready();

	return { app, calls, sessionInputs };
}

/** The body a clone request needs, valid unless a test overrides a field. */
const CREATE_BODY = {
	asset_id: ASSET_ID,
	name: "Narrator",
	description: "Warm studio voice",
};

/**
 * Builds the app that only registers the hidden routes and the OpenAPI
 * plugin.
 */
async function publishedPaths(): Promise<string[]> {
	const app = Fastify();

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(
		createSerializerCompiler({
			stringify: (value: unknown) => JSON.stringify(value),
		})
	);

	await app.register(swaggerPlugin);
	await app.register(studioVoicesRoutes);
	await app.ready();

	const document = JSON.parse(JSON.stringify(app.swagger())) as {
		paths?: Record<string, unknown>;
	};
	const paths = Object.keys(document.paths ?? {});

	await app.close();
	return paths;
}

describe("GET /studio/voices", () => {
	it("lists the caller's clones first, then the premade catalogue", async () => {
		const { app, calls, sessionInputs } = await buildApp({
			visible: [
				// The caller's own clone still present in the catalogue: the
				// ledger copy wins, so it is not duplicated as premade.
				catalogueVoice({
					voice_id: FIRST_RECORD.provider_resource_id,
					name: FIRST_RECORD.name,
					category: "premade",
				}),
				catalogueVoice({
					voice_id: SECOND_RECORD.provider_resource_id,
					name: SECOND_RECORD.name,
					category: "cloned",
				}),
				catalogueVoice({
					voice_id: "premade-1",
					name: "Rachel",
					category: "premade",
				}),
				// Another user's clone: the catalogue still holds it, but it is
				// neither owned nor premade and must never reach the caller.
				catalogueVoice({
					voice_id: "foreign-1",
					name: "Someone else's clone",
					category: "cloned",
				}),
				// A duplicate catalogue entry is kept once.
				catalogueVoice({
					voice_id: "premade-1",
					name: "Rachel (duplicate)",
					category: "premade",
				}),
			],
		});

		const response = await app.inject({
			method: "GET",
			url: "/studio/voices",
			headers: { cookie: "better-auth.session_token=test" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			items: [
				{
					voice_id: "voice-1",
					name: "Narrator",
					source: "cloned",
					resource_id: "resource-1",
					sample_asset_id: ASSET_ID,
					created_at: CREATED_AT.toISOString(),
				},
				{
					voice_id: "voice-2",
					name: "Announcer",
					source: "cloned",
					resource_id: "resource-2",
					sample_asset_id: null,
					created_at: "2026-11-19T00:00:00.000Z",
				},
				{
					voice_id: "premade-1",
					name: "Rachel",
					source: "premade",
				},
			],
		});
		expect(calls.voice.list).toEqual([{ userId: USER_ID, kind: "voice" }]);
		expect(calls.access.visible).toEqual([{}]);
		expect(sessionInputs).toHaveLength(1);
		expect(
			(sessionInputs[0] as { headers: Record<string, string> }).headers
				.cookie
		).toContain("session_token");

		await app.close();
	});

	it("answers 401 without a session, whatever API credential is sent", async () => {
		const { app, calls } = await buildApp({ session: null });

		const response = await app.inject({
			method: "GET",
			url: "/studio/voices",
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
		expect(calls.voice.list).toEqual([]);
		expect(calls.access.visible).toEqual([]);

		await app.close();
	});
});

describe("POST /studio/voices", () => {
	it("clones from the owned sample and records the caller as owner", async () => {
		const { app, calls, sessionInputs } = await buildApp();

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
			headers: { cookie: "better-auth.session_token=test" },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			resource_id: "resource-new",
			voice_id: "voice-new",
			name: "Narrator",
			sample_asset_id: ASSET_ID,
		});
		expect(calls.asset.readUrl).toEqual([
			{ userId: USER_ID, assetId: ASSET_ID },
		]);
		// The signed URL is what the provider fetches; the raw asset id never
		// leaves our side.
		expect(calls.cloner.create).toEqual([
			{
				audioUrl: SIGNED_URL,
				name: "Narrator",
				description: "Warm studio voice",
			},
		]);
		expect(calls.voice.record).toEqual([
			{
				userId: USER_ID,
				tenantId: tenantIdForUser(USER_ID),
				provider: "elevenlabs",
				providerResourceId: "voice-new",
				name: "Narrator",
				sampleAssetId: ASSET_ID,
			},
		]);
		expect(calls.cloner.remove).toEqual([]);
		expect(sessionInputs).toHaveLength(1);

		await app.close();
	});

	it("answers 401 without a session, whatever API credential is sent", async () => {
		const { app, calls } = await buildApp({ session: null });

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
			headers: {
				authorization: "Bearer api-key",
				"x-auth-token": "true",
			},
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2101,
			errors: { session: "Sign in to the dashboard and retry." },
		});
		expect(calls.asset.readUrl).toEqual([]);
		expect(calls.cloner.create).toEqual([]);
		expect(calls.voice.record).toEqual([]);

		await app.close();
	});

	it("answers 404 for a foreign or missing sample without cloning", async () => {
		const { app, calls } = await buildApp({
			readUrlError: new AssetNotFoundError(ASSET_ID),
		});

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({
			ok: false,
			code: 2301,
			errors: { asset_id: ASSET_ID },
		});
		expect(calls.cloner.create).toEqual([]);
		expect(calls.voice.record).toEqual([]);

		await app.close();
	});

	it("records nothing when the provider refuses the clone", async () => {
		const { app, calls } = await buildApp({
			createError: new ThirdPartyApiError("upstream refused", 502),
		});

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
		});

		expect(response.statusCode).toBe(502);
		expect(calls.cloner.create).toHaveLength(1);
		expect(calls.voice.record).toEqual([]);
		// Nothing was created, so there is nothing to compensate.
		expect(calls.cloner.remove).toEqual([]);

		await app.close();
	});

	it("removes the clone and answers 502 when the ledger write fails", async () => {
		const { app, calls } = await buildApp({
			recordError: new Error("ledger unavailable"),
		});

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toMatchObject({ ok: false, code: 3200 });
		// The upstream clone exists but nothing owns it: it must be removed
		// rather than left in the shared account.
		expect(calls.cloner.remove).toEqual(["voice-new"]);
		expect(calls.voice.record).toHaveLength(1);

		await app.close();
	});

	it("still answers 502 when the compensating removal fails", async () => {
		const { app, calls } = await buildApp({
			recordError: new Error("ledger unavailable"),
			removeError: new Error("upstream unavailable"),
		});

		const response = await app.inject({
			method: "POST",
			url: "/studio/voices",
			payload: CREATE_BODY,
		});

		expect(response.statusCode).toBe(502);
		expect(response.json()).toMatchObject({ ok: false, code: 3200 });
		expect(calls.cloner.remove).toEqual(["voice-new"]);

		await app.close();
	});
});

describe("the voice conflict mapping", () => {
	/**
	 * Builds a bare app with the shared error handler and one route that
	 * throws the ledger's conflict error.
	 *
	 * The conflict is a ledger refusal rather than one of the studio flows a
	 * request can reach, so the mapping is asserted directly instead of
	 * through a route that would have to fake the race.
	 */
	async function buildConflictApp(): Promise<FastifyInstance> {
		const app = Fastify();

		app.setValidatorCompiler(validatorCompiler);
		app.setSerializerCompiler(
			createSerializerCompiler({
				stringify: (value: unknown) => JSON.stringify(value),
			})
		);

		await app.register(apiResponsePlugin);

		app.get("/conflict", async () => {
			throw new VoiceConflictError("elevenlabs", "voice-1");
		});

		await app.ready();
		return app;
	}

	it("answers 409 without naming the owner", async () => {
		const app = await buildConflictApp();

		const response = await app.inject({
			method: "GET",
			url: "/conflict",
		});

		expect(response.statusCode).toBe(409);
		const body = response.json();
		expect(body).toMatchObject({
			ok: false,
			code: 2401,
			errors: { voice_id: "voice-1" },
		});
		// The caller that lost the race learns the voice is taken, never who
		// holds it.
		expect(body.message).toBe(
			"The voice is already recorded and cannot be claimed."
		);
		expect(body.message).not.toMatch(/owner|another|user|foreign|holder/i);

		await app.close();
	});
});

describe("the published OpenAPI document", () => {
	it("does not contain the studio voice endpoints", async () => {
		const paths = await publishedPaths();

		// The whole document is empty here: the only other registered route is
		// `/openapi.json`, which is hidden as well.
		expect(paths.filter((path) => path.startsWith("/studio"))).toEqual([]);
		expect(paths).toEqual([]);
	});
});
