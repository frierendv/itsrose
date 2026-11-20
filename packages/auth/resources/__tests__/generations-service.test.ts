import {
	createGenerationService,
	GenerationNotFoundError,
	type GenerationService,
} from "../src/application/generations";
import {
	GENERATION_FEATURES,
	isGenerationFeature,
	type Generation,
	type GenerationListOptions,
	type GenerationRegistryPort,
} from "../src/types";

const CLOCK = new Date("2026-11-20T04:00:00.000Z");
const ONE_DAY_LATER = new Date("2026-11-21T04:00:00.000Z");
const USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const PROVIDER = "elevenlabs";

function generation(overrides: Partial<Generation> = {}): Generation {
	return {
		generation_id: "generation-1",
		tenant_id: TENANT_ID,
		user_id: USER_ID,
		feature: "text_to_speech",
		provider: PROVIDER,
		provider_task_id: null,
		status: "succeeded",
		input_text: "Hello there",
		input_params: '{"voice_id":"voice-1"}',
		result_key: "t/users/user-1/generated/abc.mp3",
		result_content_type: "audio/mpeg",
		result_asset_id: null,
		expires_at: ONE_DAY_LATER,
		created_at: CLOCK,
		deleted_at: null,
		...overrides,
	};
}

/* -------------------------------------------------------------------------- */
/*                               Fake harness                                 */
/* -------------------------------------------------------------------------- */

type Event =
	| "findById"
	| "listForUser"
	| "insert"
	| "markSaved"
	| "softDelete"
	| "deleteAllForUser";

type RegistryCalls = {
	findById: string[];
	listForUser: Array<{
		userId: string;
		options?: GenerationListOptions;
	}>;
	insert: Generation[];
	markSaved: Array<{ generationId: string; assetId: string }>;
	softDelete: Array<{ generationId: string; at: Date }>;
	deleteAllForUser: string[];
};

type HarnessOptions = {
	/** Rows the in-memory registry starts with. */
	records?: Generation[];
	/** Canned `listForUser` result, so the pass-through is observable. */
	listResult?: Generation[];
	/** Canned `markSaved` result; `null` simulates a concurrent clear. */
	markSavedResult?: Generation | null;
	/** Forces the tombstone write's return value. */
	softDeleteResult?: boolean;
	insertError?: Error;
};

type Harness = {
	service: GenerationService;
	events: Event[];
	registryCalls: RegistryCalls;
	records: Map<string, Generation>;
};

/**
 * Builds the service against a recording in-memory registry: every port call
 * is remembered and appended to one shared event log, so ordering and
 * pass-through can be asserted without a database.
 */
function createHarness(options: HarnessOptions = {}): Harness {
	const events: Event[] = [];
	const records = new Map(
		(options.records ?? []).map((record) => [record.generation_id, record])
	);
	const registryCalls: RegistryCalls = {
		findById: [],
		listForUser: [],
		insert: [],
		markSaved: [],
		softDelete: [],
		deleteAllForUser: [],
	};

	const registry: GenerationRegistryPort = {
		async insert(record) {
			events.push("insert");
			registryCalls.insert.push(record);
			if (options.insertError) {
				throw options.insertError;
			}
			records.set(record.generation_id, record);
			return record;
		},

		async findById(generationId) {
			events.push("findById");
			registryCalls.findById.push(generationId);
			return records.get(generationId) ?? null;
		},

		async listForUser(userId, listOptions) {
			events.push("listForUser");
			registryCalls.listForUser.push({ userId, options: listOptions });
			if (options.listResult) {
				return options.listResult;
			}
			return [...records.values()].filter(
				(record) =>
					record.user_id === userId &&
					record.deleted_at === null &&
					(listOptions.feature === undefined ||
						record.feature === listOptions.feature)
			);
		},

		async markSaved(generationId, assetId) {
			events.push("markSaved");
			registryCalls.markSaved.push({ generationId, assetId });
			if (options.markSavedResult !== undefined) {
				return options.markSavedResult;
			}
			const existing = records.get(generationId);
			if (!existing || existing.deleted_at !== null) {
				return null;
			}
			const updated = { ...existing, result_asset_id: assetId };
			records.set(generationId, updated);
			return updated;
		},

		async softDelete(generationId, at) {
			events.push("softDelete");
			registryCalls.softDelete.push({ generationId, at });
			if (options.softDeleteResult !== undefined) {
				return options.softDeleteResult;
			}
			const existing = records.get(generationId);
			if (!existing || existing.deleted_at !== null) {
				return false;
			}
			records.set(generationId, { ...existing, deleted_at: at });
			return true;
		},

		async deleteAllForUser(userId) {
			events.push("deleteAllForUser");
			registryCalls.deleteAllForUser.push(userId);
			let deleted = 0;
			for (const [generationId, record] of records) {
				if (record.user_id === userId) {
					records.delete(generationId);
					deleted += 1;
				}
			}
			return deleted;
		},
	};

	const service = createGenerationService({
		registry,
		clock: () => CLOCK,
		newId: () => "generation-new",
	});

	return { service, events, registryCalls, records };
}

/* -------------------------------------------------------------------------- */
/*                                  record                                    */
/* -------------------------------------------------------------------------- */

describe("generation service record", () => {
	it("records a delivered generation with the injected id and clock", async () => {
		const harness = createHarness();

		const stored = await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			feature: "text_to_speech",
			provider: PROVIDER,
			providerTaskId: "task-1",
			inputText: "Hello there",
			inputParams: '{"voice_id":"voice-1"}',
			resultKey: "t/users/user-1/generated/abc.mp3",
			resultContentType: "audio/mpeg",
		});

		expect(harness.events).toEqual(["insert"]);
		expect(harness.registryCalls.insert).toEqual([
			{
				generation_id: "generation-new",
				tenant_id: TENANT_ID,
				user_id: USER_ID,
				feature: "text_to_speech",
				provider: PROVIDER,
				provider_task_id: "task-1",
				status: "succeeded",
				input_text: "Hello there",
				input_params: '{"voice_id":"voice-1"}',
				result_key: "t/users/user-1/generated/abc.mp3",
				result_content_type: "audio/mpeg",
				result_asset_id: null,
				expires_at: ONE_DAY_LATER,
				created_at: CLOCK,
				deleted_at: null,
			},
		]);
		expect(stored).toBe(harness.registryCalls.insert[0]);
	});

	it("leaves expires_at null when no result was stored", async () => {
		const harness = createHarness();

		const stored = await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			feature: "music_compose",
			provider: PROVIDER,
		});

		expect(stored.expires_at).toBeNull();
		expect(stored.result_key).toBeNull();
		expect(stored.result_content_type).toBeNull();
		expect(stored.provider_task_id).toBeNull();
		expect(stored.input_text).toBeNull();
		expect(stored.input_params).toBeNull();
		expect(stored.result_asset_id).toBeNull();
		expect(stored.deleted_at).toBeNull();
		expect(stored.status).toBe("succeeded");
	});

	it("does not link an asset when the generation is recorded", async () => {
		const harness = createHarness();

		await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			feature: "speech_to_speech",
			provider: PROVIDER,
			resultKey: "t/users/user-1/generated/abc.mp3",
		});

		expect(harness.registryCalls.insert[0]?.result_asset_id).toBeNull();
	});
});

/* -------------------------------------------------------------------------- */
/*                                   list                                     */
/* -------------------------------------------------------------------------- */

describe("generation service list", () => {
	it("passes the caller, filter and page window through", async () => {
		const rows = [
			generation(),
			generation({ generation_id: "generation-2" }),
		];
		const harness = createHarness({ listResult: rows });

		const listed = await harness.service.list({
			userId: USER_ID,
			feature: "music_compose",
			limit: 10,
			offset: 20,
		});

		expect(listed).toBe(rows);
		expect(harness.registryCalls.listForUser).toEqual([
			{
				userId: USER_ID,
				options: {
					feature: "music_compose",
					limit: 10,
					offset: 20,
				},
			},
		]);
	});

	it("passes an omitted feature through as undefined", async () => {
		const harness = createHarness();

		await harness.service.list({
			userId: USER_ID,
			limit: 50,
			offset: 0,
		});

		expect(harness.registryCalls.listForUser).toEqual([
			{
				userId: USER_ID,
				options: { feature: undefined, limit: 50, offset: 0 },
			},
		]);
	});
});

/* -------------------------------------------------------------------------- */
/*                                   find                                     */
/* -------------------------------------------------------------------------- */

describe("generation service find", () => {
	it("returns a live generation the caller owns", async () => {
		const record = generation();
		const harness = createHarness({ records: [record] });

		const found = await harness.service.find({
			userId: USER_ID,
			generationId: "generation-1",
		});

		expect(found).toBe(record);
		expect(harness.registryCalls.findById).toEqual(["generation-1"]);
	});

	it("throws not-found for a missing generation", async () => {
		const harness = createHarness();

		await expect(
			harness.service.find({
				userId: USER_ID,
				generationId: "generation-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);
	});

	it("throws not-found for a foreign generation without revealing its owner", async () => {
		// A conforming adapter would still return the row from `findById`;
		// the service's own ownership check is the boundary.
		const harness = createHarness({
			records: [generation({ user_id: "user-2" })],
		});

		const raised = await harness.service
			.find({ userId: USER_ID, generationId: "generation-1" })
			.catch((error: unknown) => error);

		expect(raised).toBeInstanceOf(GenerationNotFoundError);
		expect(raised).toMatchObject({
			name: "GenerationNotFoundError",
			generationId: "generation-1",
		});
		expect((raised as Error).message).not.toContain("user-2");
	});

	it("throws not-found for a soft-deleted generation", async () => {
		const harness = createHarness({
			records: [
				generation({ deleted_at: new Date("2026-11-20T03:00:00Z") }),
			],
		});

		await expect(
			harness.service.find({
				userId: USER_ID,
				generationId: "generation-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);
	});
});

/* -------------------------------------------------------------------------- */
/*                                 markSaved                                  */
/* -------------------------------------------------------------------------- */

describe("generation service markSaved", () => {
	it("checks ownership, then links the durable asset", async () => {
		const harness = createHarness({ records: [generation()] });

		const saved = await harness.service.markSaved({
			userId: USER_ID,
			generationId: "generation-1",
			assetId: "asset-1",
		});

		expect(harness.events).toEqual(["findById", "markSaved"]);
		expect(harness.registryCalls.markSaved).toEqual([
			{ generationId: "generation-1", assetId: "asset-1" },
		]);
		expect(saved.result_asset_id).toBe("asset-1");
		expect(harness.records.get("generation-1")?.result_asset_id).toBe(
			"asset-1"
		);
	});

	it("refuses to link a foreign generation", async () => {
		const harness = createHarness({
			records: [generation({ user_id: "user-2" })],
		});

		await expect(
			harness.service.markSaved({
				userId: USER_ID,
				generationId: "generation-1",
				assetId: "asset-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);

		expect(harness.registryCalls.markSaved).toEqual([]);
	});

	it("refuses to link a soft-deleted generation", async () => {
		const harness = createHarness({
			records: [
				generation({ deleted_at: new Date("2026-11-20T03:00:00Z") }),
			],
		});

		await expect(
			harness.service.markSaved({
				userId: USER_ID,
				generationId: "generation-1",
				assetId: "asset-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);

		expect(harness.registryCalls.markSaved).toEqual([]);
	});

	it("turns a concurrent clear into not-found", async () => {
		const harness = createHarness({
			records: [generation()],
			markSavedResult: null,
		});

		await expect(
			harness.service.markSaved({
				userId: USER_ID,
				generationId: "generation-1",
				assetId: "asset-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);
	});
});

/* -------------------------------------------------------------------------- */
/*                                  remove                                    */
/* -------------------------------------------------------------------------- */

describe("generation service remove", () => {
	it("tombstones the row and returns it for the ephemeral cleanup", async () => {
		const record = generation();
		const harness = createHarness({ records: [record] });

		const removed = await harness.service.remove({
			userId: USER_ID,
			generationId: "generation-1",
		});

		expect(harness.events).toEqual(["findById", "softDelete"]);
		expect(harness.registryCalls.softDelete).toEqual([
			{ generationId: "generation-1", at: CLOCK },
		]);
		expect(removed).toEqual({ ...record, deleted_at: CLOCK });
		expect(removed.result_key).toBe(record.result_key);
	});

	it("throws not-found for a missing generation without writing", async () => {
		const harness = createHarness();

		await expect(
			harness.service.remove({
				userId: USER_ID,
				generationId: "generation-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);

		expect(harness.registryCalls.softDelete).toEqual([]);
	});

	it("throws not-found for a foreign generation without writing", async () => {
		const harness = createHarness({
			records: [generation({ user_id: "user-2" })],
		});

		await expect(
			harness.service.remove({
				userId: USER_ID,
				generationId: "generation-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);

		expect(harness.registryCalls.softDelete).toEqual([]);
	});

	it("turns a lost tombstone write into not-found", async () => {
		const harness = createHarness({
			records: [generation()],
			softDeleteResult: false,
		});

		await expect(
			harness.service.remove({
				userId: USER_ID,
				generationId: "generation-1",
			})
		).rejects.toBeInstanceOf(GenerationNotFoundError);
	});
});

/* -------------------------------------------------------------------------- */
/*                              deleteAllForUser                              */
/* -------------------------------------------------------------------------- */

describe("generation service deleteAllForUser", () => {
	it("hard-deletes the caller's rows and reports the count", async () => {
		const harness = createHarness({
			records: [
				generation(),
				generation({ generation_id: "generation-2" }),
				generation({
					generation_id: "generation-3",
					user_id: "user-2",
				}),
			],
		});

		const deleted = await harness.service.deleteAllForUser(USER_ID);

		expect(deleted).toBe(2);
		expect(harness.registryCalls.deleteAllForUser).toEqual([USER_ID]);
		expect(harness.records.has("generation-1")).toBe(false);
		expect(harness.records.has("generation-2")).toBe(false);
		expect(harness.records.has("generation-3")).toBe(true);
	});

	it("is a no-op when the user owns no generations", async () => {
		const harness = createHarness();

		expect(await harness.service.deleteAllForUser(USER_ID)).toBe(0);
	});
});

/* -------------------------------------------------------------------------- */
/*                            Closed feature union                            */
/* -------------------------------------------------------------------------- */

describe("generation feature union", () => {
	it("is the closed studio feature list", () => {
		expect([...GENERATION_FEATURES]).toEqual([
			"text_to_speech",
			"text_to_speech_with_timestamps",
			"speech_to_speech",
			"text_to_dialogue",
			"music_compose",
		]);

		for (const feature of GENERATION_FEATURES) {
			expect(isGenerationFeature(feature)).toBe(true);
		}
		expect(isGenerationFeature("voice_clone")).toBe(false);
	});
});
