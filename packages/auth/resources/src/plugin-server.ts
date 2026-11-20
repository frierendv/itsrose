import { randomUUID } from "node:crypto";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import {
	createVoiceService,
	type VoiceProviderPort,
	type VoiceService,
} from "./application/voices";
import type { ProviderResourceRegistryPort } from "./types";

/**
 * Plugin id of the upstream-voice account-deletion cascade.
 */
export const VOICE_PURGE_PLUGIN_ID = "voice-purge";

/**
 * Whether the request is an account-deletion endpoint.
 *
 * Better Auth serves deletion under `/user/delete` and `/delete-user`, and a
 * deployment may mount the auth handler under a base path, so the prefix is
 * not assumed. The matcher is the one `@itsrose/auth-storage` uses, so both
 * cascades run on the same requests.
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
