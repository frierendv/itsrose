import type {
	BetterAuthOptions,
	DBAdapter,
	GenericEndpointContext,
	SecondaryStorage,
} from "better-auth";

/**
 * Secondary storage
 */
export function getStorageInstance(
	ctx: GenericEndpointContext
): SecondaryStorage | null {
	return ctx.context.secondaryStorage || null;
}

/**
 * Database adapter
 */
export function getDbAdapterInstance<
	Options extends BetterAuthOptions = BetterAuthOptions,
>(ctx: GenericEndpointContext): DBAdapter<Options> {
	return ctx.context.adapter;
}
