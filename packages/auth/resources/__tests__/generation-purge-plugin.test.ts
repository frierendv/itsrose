import type { BetterAuthPlugin } from "better-auth";
import {
	GENERATION_PURGE_PLUGIN_ID,
	generationPurgePlugin,
} from "../src/plugin-server";
import type { Generation, GenerationRegistryPort } from "../src/types";

const USER_ID = "user-1";

/* -------------------------------------------------------------------------- */
/*                               Fake harness                                 */
/* -------------------------------------------------------------------------- */

type HarnessOptions = {
	/** Makes the ledger delete reject, simulating an unreachable database. */
	deleteError?: Error;
};

type Harness = {
	registry: GenerationRegistryPort;
	deletedUsers: string[];
};

/**
 * Builds the registry port the plugin is composed with.
 *
 * Only `deleteAllForUser` is exercised by the purge; the other reads answer
 * emptily so the port stays a faithful stand-in.
 */
function createHarness(options: HarnessOptions = {}): Harness {
	const deletedUsers: string[] = [];

	const registry: GenerationRegistryPort = {
		async insert(record: Generation) {
			return record;
		},
		async findById() {
			return null;
		},
		async listForUser() {
			return [];
		},
		async markSaved() {
			return null;
		},
		async softDelete() {
			return false;
		},
		async deleteAllForUser(userId) {
			deletedUsers.push(userId);
			if (options.deleteError) {
				throw options.deleteError;
			}
			return 2;
		},
	};

	return { registry, deletedUsers };
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
		throw new Error("generationPurgePlugin declares no `after` hook.");
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

describe("generationPurgePlugin", () => {
	it("is a schema-free plugin that hooks account deletion", () => {
		const harness = createHarness();
		const plugin = generationPurgePlugin({ registry: harness.registry });

		expect(plugin.id).toBe(GENERATION_PURGE_PLUGIN_ID);
		expect(plugin.schema).toBeUndefined();
		expect(plugin.hooks?.after).toHaveLength(1);

		const hook = afterHook(plugin);
		expect(matches("/user/delete", hook)).toBe(true);
		expect(matches("/delete-user", hook)).toBe(true);
		// A deployment that mounts Better Auth under a base path still matches.
		expect(matches("/auth/delete-user", hook)).toBe(true);
		expect(matches("/sign-in/email", hook)).toBe(false);
	});

	it("hard-deletes the session user's generations", async () => {
		const harness = createHarness();
		const plugin = generationPurgePlugin({ registry: harness.registry });
		const recorder = createRecorder();

		await invoke(contextFor(recorder), afterHook(plugin));

		expect(harness.deletedUsers).toEqual([USER_ID]);
		expect(recorder.logged).toEqual([]);
	});

	it("logs a ledger failure instead of throwing into the deleted session", async () => {
		const ledgerError = new Error("database unavailable");
		const harness = createHarness({ deleteError: ledgerError });
		const plugin = generationPurgePlugin({ registry: harness.registry });
		const recorder = createRecorder();

		await expect(
			invoke(contextFor(recorder), afterHook(plugin))
		).resolves.toBeUndefined();

		expect(recorder.logged).toHaveLength(1);
		expect(recorder.logged[0]?.message).toContain(USER_ID);
		expect(recorder.logged[0]?.args).toEqual([ledgerError]);
	});

	it("does nothing when the request carries no session user", async () => {
		const harness = createHarness();
		const plugin = generationPurgePlugin({ registry: harness.registry });
		const recorder = createRecorder();

		await invoke(contextFor(recorder, null), afterHook(plugin));

		expect(harness.deletedUsers).toEqual([]);
		expect(recorder.logged).toEqual([]);
	});
});
