/**
 * Transport helper for the usage plugin routes.
 *
 * Kept dependency-free so `plugin-client.ts` can import it without pulling any
 * server-only module into a browser bundle.
 */
export type UsageRoute<Path extends string> = `/usage${Path}`;

export function createRoute<const Path extends `/${string}`>(
	path: Path
): UsageRoute<Path> {
	return `/usage${path}`;
}
