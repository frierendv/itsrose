import {
	createVoiceService,
	VoiceConflictError,
	VoiceNotFoundError,
	type VoiceProviderPort,
	type VoiceService,
} from "../src/application/voices";
import type {
	ProviderResource,
	ProviderResourceListOptions,
	ProviderResourceRegistryPort,
} from "../src/types";

const CLOCK = new Date("2026-11-20T04:00:00.000Z");
const USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const PROVIDER = "elevenlabs";

function resource(overrides: Partial<ProviderResource> = {}): ProviderResource {
	return {
		resource_id: "resource-1",
		provider: PROVIDER,
		provider_resource_id: "voice-1",
		tenant_id: TENANT_ID,
		user_id: USER_ID,
		kind: "voice",
		name: "Narrator",
		sample_asset_id: null,
		status: "active",
		created_at: CLOCK,
		deleted_at: null,
		...overrides,
	};
}

/* -------------------------------------------------------------------------- */
/*                               Fake harness                                 */
/* -------------------------------------------------------------------------- */

type Event =
	| "findByProviderResourceId"
	| "listForUser"
	| "insert"
	| "deleteVoice"
	| "softDelete";

type RegistryCalls = {
	findByProviderResourceId: Array<{
		provider: string;
		providerResourceId: string;
	}>;
	listForUser: Array<{
		userId: string;
		options?: ProviderResourceListOptions;
	}>;
	insert: ProviderResource[];
	softDelete: Array<{ resourceId: string; at: Date }>;
};

type HarnessOptions = {
	/** Rows the in-memory registry starts with. */
	records?: ProviderResource[];
	/** Canned `listForUser` result, so an unfiltered port can be simulated. */
	listResult?: ProviderResource[];
	/** Canned `findByProviderResourceId` result; `null` for "no row". */
	providerLookup?: ProviderResource | null;
	/** The upstream id whose delete rejects, and the error it rejects with. */
	deleteVoiceFailure?: { voiceId: string; error: unknown };
	/** Makes the row tombstone write fail after a successful upstream delete. */
	softDeleteFailure?: Error;
	insertError?: Error;
};

type Harness = {
	service: VoiceService;
	events: Event[];
	registryCalls: RegistryCalls;
	deleteVoiceCalls: string[];
	records: Map<string, ProviderResource>;
};

/**
 * Builds the service against recording fakes: every port answers from memory,
 * remembers its calls, and appends to one shared event log so ordering across
 * ports can be asserted.
 */
function createHarness(options: HarnessOptions = {}): Harness {
	const events: Event[] = [];
	const records = new Map(
		(options.records ?? []).map((record) => [record.resource_id, record])
	);
	const deleteVoiceCalls: string[] = [];
	const registryCalls: RegistryCalls = {
		findByProviderResourceId: [],
		listForUser: [],
		insert: [],
		softDelete: [],
	};

	const registry: ProviderResourceRegistryPort = {
		async insert(record) {
			events.push("insert");
			registryCalls.insert.push(record);
			if (options.insertError) {
				throw options.insertError;
			}
			records.set(record.resource_id, record);
			return record;
		},

		async findById(resourceId) {
			return records.get(resourceId) ?? null;
		},

		async findByProviderResourceId(provider, providerResourceId) {
			events.push("findByProviderResourceId");
			registryCalls.findByProviderResourceId.push({
				provider,
				providerResourceId,
			});
			if (options.providerLookup !== undefined) {
				return options.providerLookup;
			}
			return (
				[...records.values()].find(
					(record) =>
						record.provider === provider &&
						record.provider_resource_id === providerResourceId &&
						record.deleted_at === null
				) ?? null
			);
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
					(listOptions?.kind === undefined ||
						record.kind === listOptions.kind)
			);
		},

		async softDelete(resourceId, at) {
			events.push("softDelete");
			registryCalls.softDelete.push({ resourceId, at });
			if (options.softDeleteFailure) {
				throw options.softDeleteFailure;
			}
			const existing = records.get(resourceId);
			if (!existing) {
				return false;
			}
			records.set(resourceId, { ...existing, deleted_at: at });
			return true;
		},
	};

	const provider: VoiceProviderPort = {
		async deleteVoice(voiceId) {
			events.push("deleteVoice");
			deleteVoiceCalls.push(voiceId);
			if (options.deleteVoiceFailure?.voiceId === voiceId) {
				throw options.deleteVoiceFailure.error;
			}
		},
	};

	const service = createVoiceService({
		registry,
		provider,
		clock: () => CLOCK,
		newId: () => "resource-new",
	});

	return {
		service,
		events,
		registryCalls,
		deleteVoiceCalls,
		records,
	};
}

/* -------------------------------------------------------------------------- */
/*                                  record                                    */
/* -------------------------------------------------------------------------- */

describe("voice service record", () => {
	it("records a new voice with the injected id and clock", async () => {
		const harness = createHarness();

		const stored = await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			provider: PROVIDER,
			providerResourceId: "voice-1",
			name: "Narrator",
		});

		expect(harness.events).toEqual(["findByProviderResourceId", "insert"]);
		expect(harness.registryCalls.findByProviderResourceId).toEqual([
			{ provider: PROVIDER, providerResourceId: "voice-1" },
		]);
		expect(harness.registryCalls.insert).toEqual([
			{
				resource_id: "resource-new",
				provider: PROVIDER,
				provider_resource_id: "voice-1",
				tenant_id: TENANT_ID,
				user_id: USER_ID,
				kind: "voice",
				name: "Narrator",
				sample_asset_id: null,
				status: "active",
				created_at: CLOCK,
				deleted_at: null,
			},
		]);
		expect(stored).toBe(harness.registryCalls.insert[0]);
	});

	it("records the sample asset the clone was made from", async () => {
		const harness = createHarness();

		await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			provider: PROVIDER,
			providerResourceId: "voice-1",
			name: "Narrator",
			sampleAssetId: "asset-1",
		});

		expect(harness.registryCalls.insert[0]?.sample_asset_id).toBe(
			"asset-1"
		);
	});

	it("returns the existing row when its owner re-records the voice", async () => {
		const existing = resource();
		const harness = createHarness({ records: [existing] });

		const stored = await harness.service.record({
			userId: USER_ID,
			tenantId: TENANT_ID,
			provider: PROVIDER,
			providerResourceId: "voice-1",
			name: "Narrator again",
		});

		expect(stored).toBe(existing);
		expect(harness.registryCalls.insert).toEqual([]);
		expect(harness.events).toEqual(["findByProviderResourceId"]);
	});

	it("rejects a duplicate owned by another user without naming the owner", async () => {
		const harness = createHarness({
			records: [resource({ user_id: "user-2" })],
		});

		const raised = await harness.service
			.record({
				userId: USER_ID,
				tenantId: TENANT_ID,
				provider: PROVIDER,
				providerResourceId: "voice-1",
				name: "Narrator",
			})
			.catch((error: unknown) => error);

		expect(raised).toBeInstanceOf(VoiceConflictError);
		expect(raised).toMatchObject({
			name: "VoiceConflictError",
			provider: PROVIDER,
			providerResourceId: "voice-1",
		});
		expect((raised as Error).message).not.toContain("user-2");
		expect(harness.registryCalls.insert).toEqual([]);
	});
});

/* -------------------------------------------------------------------------- */
/*                                   list                                     */
/* -------------------------------------------------------------------------- */

describe("voice service list", () => {
	it("passes the caller and kind through to the registry", async () => {
		const rows = [
			resource(),
			resource({
				resource_id: "resource-2",
				provider_resource_id: "voice-2",
			}),
		];
		const harness = createHarness({ listResult: rows });

		const listed = await harness.service.list({
			userId: USER_ID,
			kind: "voice",
		});

		expect(listed).toBe(rows);
		expect(harness.registryCalls.listForUser).toEqual([
			{ userId: USER_ID, options: { kind: "voice" } },
		]);
	});

	it("passes an omitted kind through as undefined", async () => {
		const harness = createHarness();

		await harness.service.list({ userId: USER_ID });

		expect(harness.registryCalls.listForUser).toEqual([
			{ userId: USER_ID, options: { kind: undefined } },
		]);
	});
});

/* -------------------------------------------------------------------------- */
/*                                  remove                                    */
/* -------------------------------------------------------------------------- */

describe("voice service remove", () => {
	it("deletes upstream before tombstoning the row", async () => {
		const harness = createHarness({ records: [resource()] });

		await harness.service.remove({
			userId: USER_ID,
			providerResourceId: "voice-1",
		});

		expect(harness.events).toEqual([
			"listForUser",
			"deleteVoice",
			"softDelete",
		]);
		expect(harness.deleteVoiceCalls).toEqual(["voice-1"]);
		expect(harness.registryCalls.softDelete).toEqual([
			{ resourceId: "resource-1", at: CLOCK },
		]);
		expect(harness.records.get("resource-1")?.deleted_at).toBe(CLOCK);
	});

	it("leaves the row live when the upstream delete fails", async () => {
		const failure = new Error("upstream unavailable");
		const harness = createHarness({
			records: [resource()],
			deleteVoiceFailure: { voiceId: "voice-1", error: failure },
		});

		await expect(
			harness.service.remove({
				userId: USER_ID,
				providerResourceId: "voice-1",
			})
		).rejects.toBe(failure);

		expect(harness.registryCalls.softDelete).toEqual([]);
		expect(harness.records.get("resource-1")?.deleted_at).toBeNull();
	});

	it("throws not-found for a missing voice without calling the provider", async () => {
		const harness = createHarness({ listResult: [] });

		await expect(
			harness.service.remove({
				userId: USER_ID,
				providerResourceId: "voice-1",
			})
		).rejects.toBeInstanceOf(VoiceNotFoundError);

		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(harness.registryCalls.softDelete).toEqual([]);
	});

	it("throws not-found for a foreign voice without calling the provider", async () => {
		// A conforming adapter never returns another owner's row; the fake
		// does, to prove the service's own ownership check is the boundary.
		const harness = createHarness({
			listResult: [resource({ user_id: "user-2" })],
		});

		await expect(
			harness.service.remove({
				userId: USER_ID,
				providerResourceId: "voice-1",
			})
		).rejects.toBeInstanceOf(VoiceNotFoundError);

		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(harness.registryCalls.softDelete).toEqual([]);
	});

	it("throws not-found for a soft-deleted voice without calling the provider", async () => {
		const harness = createHarness({
			listResult: [
				resource({ deleted_at: new Date("2026-11-20T03:00:00Z") }),
			],
		});

		await expect(
			harness.service.remove({
				userId: USER_ID,
				providerResourceId: "voice-1",
			})
		).rejects.toBeInstanceOf(VoiceNotFoundError);

		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(harness.registryCalls.softDelete).toEqual([]);
	});
});

/* -------------------------------------------------------------------------- */
/*                             removeAllForUser                               */
/* -------------------------------------------------------------------------- */

describe("voice service removeAllForUser", () => {
	it("deletes every voice upstream and tombstones each success", async () => {
		const harness = createHarness({
			records: [
				resource(),
				resource({
					resource_id: "resource-2",
					provider_resource_id: "voice-2",
				}),
			],
		});

		const summary = await harness.service.removeAllForUser({
			userId: USER_ID,
		});

		expect(summary).toEqual({ deleted: 2, failed: [] });
		expect(harness.deleteVoiceCalls).toEqual(["voice-1", "voice-2"]);
		expect(harness.registryCalls.softDelete).toEqual([
			{ resourceId: "resource-1", at: CLOCK },
			{ resourceId: "resource-2", at: CLOCK },
		]);
		expect(harness.records.get("resource-1")?.deleted_at).toBe(CLOCK);
		expect(harness.records.get("resource-2")?.deleted_at).toBe(CLOCK);
	});

	it("collects a failed upstream delete and keeps that row live", async () => {
		const failure = new Error("upstream unavailable");
		const harness = createHarness({
			records: [
				resource(),
				resource({
					resource_id: "resource-2",
					provider_resource_id: "voice-2",
				}),
				resource({
					resource_id: "resource-3",
					provider_resource_id: "voice-3",
				}),
			],
			deleteVoiceFailure: { voiceId: "voice-2", error: failure },
		});

		const summary = await harness.service.removeAllForUser({
			userId: USER_ID,
		});

		expect(summary).toEqual({
			deleted: 2,
			failed: [{ provider_resource_id: "voice-2", error: failure }],
		});
		expect(harness.registryCalls.softDelete).toEqual([
			{ resourceId: "resource-1", at: CLOCK },
			{ resourceId: "resource-3", at: CLOCK },
		]);
		expect(harness.records.get("resource-2")?.deleted_at).toBeNull();
	});

	it("collects a failed tombstone write without throwing", async () => {
		const failure = new Error("database unavailable");
		const harness = createHarness({
			records: [resource()],
			softDeleteFailure: failure,
		});

		const summary = await harness.service.removeAllForUser({
			userId: USER_ID,
		});

		expect(summary).toEqual({
			deleted: 0,
			failed: [{ provider_resource_id: "voice-1", error: failure }],
		});
	});

	it("is a no-op when the user owns no voices", async () => {
		const harness = createHarness({ records: [] });

		const summary = await harness.service.removeAllForUser({
			userId: USER_ID,
		});

		expect(summary).toEqual({ deleted: 0, failed: [] });
		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(harness.registryCalls.listForUser).toEqual([
			{ userId: USER_ID, options: { kind: "voice" } },
		]);
	});
});
