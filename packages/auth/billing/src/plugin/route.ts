/**
 * Transport helper for the billing plugin routes.
 *
 * Kept dependency-free so `plugin-client.ts` can import it without pulling any
 * server-only module into a browser bundle.
 */
export type InternalRoute<Path extends string> = `/itsrose${Path}`;

export function createRoute<const Path extends `/${string}`>(
	path: Path
): InternalRoute<Path> {
	return `/itsrose${path}`;
}
