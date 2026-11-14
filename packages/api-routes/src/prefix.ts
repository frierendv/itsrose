import { SystemError } from "@itsrose/system";
import type { FastifyInstance } from "fastify";
import type { RouteModuleName } from "./options";

/**
 * The URL namespace a route module lives in.
 *
 * A prefix is either empty - the module's routes live at the root of the
 * application - or a normalized path such as `/audio`.
 */
export type RoutePrefix = string;

/**
 * A single segment of a prefix.
 *
 * The characters are deliberately narrow: a prefix ends up in a URL, so it
 * may only carry the characters that identify a namespace without changing
 * the meaning of the URL (no spaces, no query, no fragment).
 */
const PREFIX_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * The prefixes claimed per Fastify application.
 *
 * The registry is keyed by the HTTP server of the application: the root
 * instance and every encapsulated child share that server, while two
 * applications in the same process never do. A registry on the instance
 * itself would not work, because every `register` creates a child instance.
 */
const CLAIMED_PREFIXES = new WeakMap<object, Map<string, string>>();

/**
 * Normalizes a prefix.
 *
 * The prefix is trimmed, its segments are collapsed (so `//audio//v2//`
 * becomes `/audio/v2`) and it never ends with a slash. An empty prefix - or
 * a prefix of only slashes - means the root.
 *
 * @param prefix - The prefix to normalize.
 * @returns The normalized prefix.
 * @throws {SystemError} When a segment holds a character a prefix may not
 * carry.
 */
const normalizePrefix = (prefix: string): RoutePrefix => {
	const segments = prefix
		.trim()
		.split("/")
		.filter((segment) => segment !== "");

	for (const segment of segments) {
		if (!PREFIX_SEGMENT.test(segment)) {
			throw new SystemError(
				`Invalid route prefix "${prefix}": a prefix may only hold letters, digits, "-", "_" and "/" between the segments.`
			);
		}
	}

	return segments.length === 0 ? "" : `/${segments.join("/")}`;
};

/**
 * Resolves the prefix a route module is mounted under.
 *
 * An app that does not pass a prefix gets the default of the module - the
 * name of the package the routes belong to. An app that passes an empty
 * prefix mounts the module at the root.
 *
 * @param prefix - The prefix the app asked for.
 * @param fallback - The default prefix of the module.
 * @returns The normalized prefix.
 * @throws {SystemError} When the prefix is not a valid namespace.
 */
export const resolvePrefix = (
	prefix: string | undefined,
	fallback: string
): RoutePrefix => {
	return prefix === undefined
		? normalizePrefix(fallback)
		: normalizePrefix(prefix);
};

/**
 * Joins a prefix and the path of a route.
 *
 * The result never holds a double slash and never ends with a slash.
 *
 * @param prefix - The normalized prefix of the module.
 * @param path - The path of the route, relative to the prefix.
 * @returns The full path of the route.
 */
export const joinUrl = (prefix: RoutePrefix, path: string): string => {
	const cleanPrefix = normalizePrefix(prefix);
	const cleanPath = path.startsWith("/") ? path : `/${path}`;

	if (cleanPrefix === "") {
		return cleanPath;
	}

	return `${cleanPrefix}${cleanPath}`;
};

/**
 * Claims a prefix for a route module.
 *
 * Two modules may not share a namespace: their routes would end up mixed
 * under one prefix, and the app could no longer tell which package serves
 * which path. The claim is made when the module registers, so the collision
 * surfaces at boot instead of at the first request.
 *
 * @param fastify - The Fastify instance the module is registered on.
 * @param prefix - The normalized prefix of the module.
 * @param moduleName - The name of the module, used in the error message.
 * @returns The claimed prefix.
 * @throws {SystemError} When the prefix is already claimed.
 */
export const claimRoutePrefix = (
	fastify: FastifyInstance,
	prefix: RoutePrefix,
	moduleName: RouteModuleName
): RoutePrefix => {
	const application = fastify.server as unknown as object;

	let claims = CLAIMED_PREFIXES.get(application);
	if (!claims) {
		claims = new Map<string, string>();
		CLAIMED_PREFIXES.set(application, claims);
	}

	const owner = claims.get(prefix);
	if (owner) {
		throw new SystemError(
			`The route module "${moduleName}" cannot use the prefix "${prefix}": it is already claimed by the route module "${owner}".`
		);
	}

	claims.set(prefix, moduleName);

	return prefix;
};
