import type { BetterAuthPlugin } from "better-auth";
import {
	createVoiceService,
	type VoiceProviderPort,
} from "../src/application/voices";
import { VOICE_PURGE_PLUGIN_ID, voicePurgePlugin } from "../src/plugin-server";
import type {
	ProviderResource,
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

type HarnessOptions = {
	/** Rows the in-memory ledger starts with. */
	records?: ProviderResource[];
	/** The upstream id whose delete rejects, and the error it rejects with. */
	deleteFailure?: { voiceId: string; error: unknown };
	/** Makes the ledger read reject, simulating an unreachable database. */
	listError?: Error;
};

type Harness = {
	registry: ProviderResourceRegistryPort;
	provider: VoiceProviderPort;
	records: Map<string, ProviderResource>;
	deleteVoiceCalls: string[];
	events: string[];
	listedUsers: string[];
};

/**
 * Builds the two ports the plugin is composed with over recording fakes.
 *
 * The ledger is in-memory, so a test can assert whether a row was tombstoned;
 * the provider records the upstream deletes and can be told to fail one of
 * them.
 */
function createHarness(options: HarnessOptions = {}): Harness {
	const records = new Map(
		(options.records ?? []).map((record) => [record.resource_id, record])
	);
	const deleteVoiceCalls: string[] = [];
	const events: string[] = [];
	const listedUsers: string[] = [];

	const registry: ProviderResourceRegistryPort = {
		async insert(record) {
			records.set(record.resource_id, record);
			return record;
		},
		async findById() {
			return null;
		},
		async findByProviderResourceId() {
			return null;
		},
		async listForUser(userId, listOptions) {
			events.push("listForUser");
			listedUsers.push(userId);
			if (options.listError) {
				throw options.listError;
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
			events.push(`softDelete:${resourceId}`);
			const record = records.get(resourceId);
			if (!record || record.deleted_at !== null) {
				return false;
			}
			record.deleted_at = at;
			return true;
		},
	};

	const provider: VoiceProviderPort = {
		async deleteVoice(voiceId) {
			events.push(`deleteVoice:${voiceId}`);
			deleteVoiceCalls.push(voiceId);
			if (options.deleteFailure?.voiceId === voiceId) {
				throw options.deleteFailure.error;
			}
		},
	};

	return {
		registry,
		provider,
		records,
		deleteVoiceCalls,
		events,
		listedUsers,
	};
}

/**
 * The `after` hook the plugin declares.
 */
type PurgeHook = NonNullable<
	NonNullable<BetterAuthPlugin["hooks"]>["after"]
>[number];

type PurgeContext = {
	context: {
		session?: { user?: { id: string } };
		logger: {
			error: (message: string, ...args: unknown[]) => void;
		};
	};
};

type Recorder = {
	logged: Array<{ message: string; args: unknown[] }>;
	logger: PurgeContext["context"]["logger"];
};

/** Builds a logger that records what the purge reported. */
function createRecorder(): Recorder {
	const logged: Recorder["logged"] = [];

	return {
		logged,
		logger: {
			error(message, ...args) {
				logged.push({ message, args });
			},
		},
	};
}

/** Runs the deletion matcher of the plugin's hook. */
function matches(path: string, hook: PurgeHook): boolean {
	const context = { path } as unknown as Parameters<PurgeHook["matcher"]>[0];
	return hook.matcher(context);
}

/**
 * Invokes the hook handler the way Better Auth would on account deletion.
 *
 * The handler is typed as Better Auth's middleware, whose input context is the
 * whole endpoint context; the fake only carries what the hook reads.
 */
async function invoke(context: PurgeContext, hook: PurgeHook): Promise<void> {
	const handler = hook.handler as unknown as (
		ctx: PurgeContext
	) => Promise<unknown>;
	await handler(context);
}

/** The hook of the plugin, or a failure that names the mistake. */
function afterHook(plugin: BetterAuthPlugin): PurgeHook {
	const hook = plugin.hooks?.after?.[0];
	if (!hook) {
		throw new Error("voicePurgePlugin declares no `after` hook.");
	}
	return hook;
}

function contextFor(
	recorder: Recorder,
	userId: string | null = USER_ID
): PurgeContext {
	return {
		context: {
			...(userId ? { session: { user: { id: userId } } } : {}),
			logger: recorder.logger,
		},
	};
}

/* -------------------------------------------------------------------------- */
/*                                   Tests                                    */
/* -------------------------------------------------------------------------- */

describe("voicePurgePlugin", () => {
	it("is a schema-free plugin that hooks account deletion", () => {
		const harness = createHarness();
		const plugin = voicePurgePlugin({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
		});

		expect(plugin.id).toBe(VOICE_PURGE_PLUGIN_ID);
		expect(plugin.schema).toBeUndefined();
		expect(plugin.hooks?.after).toHaveLength(1);

		const hook = afterHook(plugin);
		expect(matches("/user/delete", hook)).toBe(true);
		expect(matches("/delete-user", hook)).toBe(true);
		// A deployment that mounts Better Auth under a base path still matches.
		expect(matches("/auth/delete-user", hook)).toBe(true);
		expect(matches("/sign-in/email", hook)).toBe(false);
	});

	it("deletes every live upstream voice, then tombstones its row", async () => {
		const harness = createHarness({
			records: [
				resource(),
				resource({
					resource_id: "resource-2",
					provider_resource_id: "voice-2",
					name: "Announcer",
				}),
			],
		});
		const plugin = voicePurgePlugin({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
		});
		const recorder = createRecorder();

		await invoke(contextFor(recorder), afterHook(plugin));

		expect(harness.deleteVoiceCalls).toEqual(["voice-1", "voice-2"]);
		expect(harness.events).toEqual([
			"listForUser",
			"deleteVoice:voice-1",
			"softDelete:resource-1",
			"deleteVoice:voice-2",
			"softDelete:resource-2",
		]);
		expect(harness.records.get("resource-1")?.deleted_at).toEqual(CLOCK);
		expect(harness.records.get("resource-2")?.deleted_at).toEqual(CLOCK);
		expect(recorder.logged).toEqual([]);
	});

	it("logs a failed upstream delete with the user id and voice id, and keeps the row live", async () => {
		const upstreamError = new Error("upstream refused");
		const harness = createHarness({
			records: [
				resource(),
				resource({
					resource_id: "resource-2",
					provider_resource_id: "voice-2",
					name: "Announcer",
				}),
			],
			deleteFailure: { voiceId: "voice-2", error: upstreamError },
		});
		const plugin = voicePurgePlugin({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
		});
		const recorder = createRecorder();

		await expect(
			invoke(contextFor(recorder), afterHook(plugin))
		).resolves.toBeUndefined();

		expect(harness.records.get("resource-1")?.deleted_at).toEqual(CLOCK);
		// The row is the retry manifest: it stays live when the upstream
		// object is still there.
		expect(harness.records.get("resource-2")?.deleted_at).toBeNull();
		expect(recorder.logged).toHaveLength(1);
		expect(recorder.logged[0]?.message).toContain(USER_ID);
		expect(recorder.logged[0]?.message).toContain("voice-2");
		expect(recorder.logged[0]?.args).toEqual([upstreamError]);
	});

	it("logs a ledger failure instead of throwing into the deleted session", async () => {
		const ledgerError = new Error("database unavailable");
		const harness = createHarness({ listError: ledgerError });
		const plugin = voicePurgePlugin({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
		});
		const recorder = createRecorder();

		await expect(
			invoke(contextFor(recorder), afterHook(plugin))
		).resolves.toBeUndefined();

		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(recorder.logged).toHaveLength(1);
		expect(recorder.logged[0]?.message).toContain(USER_ID);
		expect(recorder.logged[0]?.args).toEqual([ledgerError]);
	});

	it("does nothing when the request carries no session user", async () => {
		const harness = createHarness({ records: [resource()] });
		const plugin = voicePurgePlugin({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
		});
		const recorder = createRecorder();

		await invoke(contextFor(recorder, null), afterHook(plugin));

		expect(harness.listedUsers).toEqual([]);
		expect(harness.deleteVoiceCalls).toEqual([]);
		expect(recorder.logged).toEqual([]);
	});

	it("builds the same service the host could compose directly", async () => {
		const harness = createHarness({ records: [resource()] });
		const service = createVoiceService({
			registry: harness.registry,
			provider: harness.provider,
			clock: () => CLOCK,
			newId: () => "resource-generated",
		});

		const summary = await service.removeAllForUser({ userId: USER_ID });

		expect(summary).toEqual({ deleted: 1, failed: [] });
		expect(harness.deleteVoiceCalls).toEqual(["voice-1"]);
	});
});
