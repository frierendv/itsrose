import { randomUUID } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import {
	createGenerationService,
	type GenerationService,
} from "./application/generations";
import {
	createVoiceService,
	type VoiceProviderPort,
	type VoiceService,
} from "./application/voices";
import type {
	GenerationRegistryPort,
	ProviderResourceRegistryPort,
} from "./types";

/**
 * Plugin id of the upstream-voice account-deletion cascade.
 */
export const VOICE_PURGE_PLUGIN_ID = "voice-purge";

/**
 * Whether the request is an account-deletion endpoint.
 *
 * Better Auth serves deletion under `/user/delete` and `/delete-user`, and a
 * deployment may mount the auth handler under a base path, so the prefix is
 * not assumed. The matcher is the one `@itsrose/auth-storage` uses, so every
 * account-deletion cascade runs on the same requests.
 *
 * @param path - The path of the request Better Auth is serving.
 * @returns `true` when the account is being deleted.
 */
const isAccountDeletionPath = (path: string | undefined): boolean =>
	path === "/user/delete" ||
	path === "/delete-user" ||
	Boolean(path?.endsWith("/delete-user"));

/**
 * Sink for the failures of the account-deletion purge.
 *
 * Better Auth's `ctx.context.logger` satisfies it; tests can pass a recorder.
 */
export interface VoicePurgeLogger {
	error?: (message: string, ...args: unknown[]) => void;
}

/**
 * Inputs for {@linkcode purgeVoicesOnAccountDelete}.
 */
export interface PurgeVoicesOnDeleteOptions {
	/** The ledger service the voices are purged through. */
	service: VoiceService;
	/** Where a failure is reported; omitted, failures are silent. */
	logger?: VoicePurgeLogger;
}

/**
 * Runs the voice half of account deletion.
 *
 * The account is already gone when this runs, so nothing here may throw into
 * the deleted session: every failure — a failed upstream delete, a failed row
 * delete, an unreachable ledger — is logged at error level with the user id
 * and, when known, the voice id. The row stays live as the retry manifest, so
 * an operator can finish the purge.
 *
 * @param userId - The deleted user whose upstream voices are purged.
 * @param options - The ledger service and the log sink.
 */
export async function purgeVoicesOnAccountDelete(
	userId: string,
	options: PurgeVoicesOnDeleteOptions
): Promise<void> {
	try {
		const summary = await options.service.removeAllForUser({ userId });

		for (const failure of summary.failed) {
			options.logger?.error?.(
				`[voicePurgePlugin] Failed to delete upstream voice "${failure.provider_resource_id}" for deleted user "${userId}"; the ledger row was kept so the purge can be retried.`,
				failure.error
			);
		}
	} catch (error) {
		options.logger?.error?.(
			`[voicePurgePlugin] Failed to purge the upstream voices of deleted user "${userId}".`,
			error
		);
	}
}

/**
 * Options of {@linkcode voicePurgePlugin}.
 */
export interface VoicePurgePluginOptions {
	/** Persistence port of the provider-resource ledger. */
	registry: ProviderResourceRegistryPort;
	/** Upstream deletion port, composed by the host over the feature client. */
	provider: VoiceProviderPort;
	/** Injected clock, so the tombstones stay deterministic in tests. */
	clock?: () => Date;
}

/**
 * Better Auth plugin that deletes a user's upstream voices when the user is
 * deleted.
 *
 * The plugin is schema-free and carries no endpoint: the ledger schema is
 * registered by `@itsrose/auth`, and the host application composes the ports.
 * It only adds an `after` hook on account deletion, which is the same place
 * `@itsrose/auth-storage` purges the user's objects.
 *
 * The upstream deletion arrives as an injected port so this package never
 * imports the ElevenLabs client.
 *
 * @param options - The ledger, the upstream deletion and the clock.
 * @returns The Better Auth plugin to append to the `plugins` array.
 */
export function voicePurgePlugin(
	options: VoicePurgePluginOptions
): BetterAuthPlugin {
	const service = createVoiceService({
		registry: options.registry,
		provider: options.provider,
		clock: options.clock ?? (() => new Date()),
		newId: () => randomUUID(),
	});

	return {
		id: VOICE_PURGE_PLUGIN_ID,
		hooks: {
			after: [
				{
					matcher: (context) => isAccountDeletionPath(context.path),
					handler: createAuthMiddleware(async (ctx) => {
						const userId = ctx.context.session?.user?.id;
						if (!userId) {
							return;
						}

						await purgeVoicesOnAccountDelete(userId, {
							service,
							logger: ctx.context.logger,
						});
					}),
				},
			],
		},
	} satisfies BetterAuthPlugin;
}

/* -------------------------------------------------------------------------- */
/*                          Generation history purge                          */
/* -------------------------------------------------------------------------- */

/**
 * Plugin id of the generation-history account-deletion cascade.
 */
export const GENERATION_PURGE_PLUGIN_ID = "generation-purge";

/**
 * Sink for the failures of the generation-history purge.
 *
 * Better Auth's `ctx.context.logger` satisfies it; tests can pass a recorder.
 */
export interface GenerationPurgeLogger {
	error?: (message: string, ...args: unknown[]) => void;
}

/**
 * Inputs for {@linkcode purgeGenerationsOnAccountDelete}.
 */
export interface PurgeGenerationsOnDeleteOptions {
	/** The ledger service the history rows are deleted through. */
	service: Pick<GenerationService, "deleteAllForUser">;
	/** Where a failure is reported; omitted, failures are silent. */
	logger?: GenerationPurgeLogger;
}

/**
 * Runs the history half of account deletion.
 *
 * A generation row is a ledger entry, not a durable record that has to outlive
 * the account, so it is hard-deleted rather than tombstoned. The objects it
 * pointed at are already covered by the storage purge: the ephemeral
 * `t/users/{userId}/` root and the durable assets root are both purged by the
 * auth storage hook, so nothing here touches the bucket.
 *
 * The account is already gone when this runs, so a failure is logged at error
 * level with the user id instead of thrown into the deleted session.
 *
 * @param userId - The deleted user whose history is purged.
 * @param options - The ledger service and the log sink.
 */
export async function purgeGenerationsOnAccountDelete(
	userId: string,
	options: PurgeGenerationsOnDeleteOptions
): Promise<void> {
	try {
		await options.service.deleteAllForUser(userId);
	} catch (error) {
		options.logger?.error?.(
			`[generationPurgePlugin] Failed to purge the generations of deleted user "${userId}".`,
			error
		);
	}
}

/**
 * Options of {@linkcode generationPurgePlugin}.
 */
export interface GenerationPurgePluginOptions {
	/** Persistence port of the generation ledger. */
	registry: GenerationRegistryPort;
	/** Injected clock, so the composed service stays deterministic in tests. */
	clock?: () => Date;
}

/**
 * Better Auth plugin that hard-deletes a user's generation history when the
 * user is deleted.
 *
 * The plugin is schema-free and carries no endpoint: the ledger schema is
 * registered by `@itsrose/auth`, and the host application composes the
 * registry. It adds the same account-deletion `after` hook the storage and
 * voice purges use, and it runs beside them: the voice cascade owns upstream
 * objects, the storage cascade owns the bucket, and this one owns the ledger
 * rows.
 *
 * @param options - The ledger and the clock.
 * @returns The Better Auth plugin to append to the `plugins` array.
 */
export function generationPurgePlugin(
	options: GenerationPurgePluginOptions
): BetterAuthPlugin {
	const service = createGenerationService({
		registry: options.registry,
		clock: options.clock ?? (() => new Date()),
		newId: () => randomUUID(),
	});

	return {
		id: GENERATION_PURGE_PLUGIN_ID,
		hooks: {
			after: [
				{
					matcher: (context) => isAccountDeletionPath(context.path),
					handler: createAuthMiddleware(async (ctx) => {
						const userId = ctx.context.session?.user?.id;
						if (!userId) {
							return;
						}

						await purgeGenerationsOnAccountDelete(userId, {
							service,
							logger: ctx.context.logger,
						});
					}),
				},
			],
		},
	} satisfies BetterAuthPlugin;
}
