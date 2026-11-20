import { deny } from "@/lib/auth";
import type { AuthServer } from "@itsrose/auth/server";
import type { FastifyReply, FastifyRequest } from "fastify";

/* -------------------------------------------------------------------------- */
/*                                 Responses                                  */
/* -------------------------------------------------------------------------- */

/**
 * The `errors` payload every session denial carries.
 *
 * The code (`UNAUTHORIZED`, 2101) and this field are the envelope the
 * dashboard already handles; a session-only route may vary its `message` but
 * nothing else.
 */
const SESSION_ERRORS = {
	session: "Sign in to the dashboard and retry.",
} as const;

/**
 * Sends the shared "a dashboard session is required" failure.
 *
 * @param reply - The reply that answers the request.
 * @param message - Why this route needs a session.
 * @returns The reply, already sent.
 */
export function denySession(
	reply: FastifyReply,
	message: string
): FastifyReply {
	return deny(reply, {
		code: "UNAUTHORIZED",
		message,
		errors: { ...SESSION_ERRORS },
	});
}

/* -------------------------------------------------------------------------- */
/*                                   Guard                                    */
/* -------------------------------------------------------------------------- */

/**
 * The two halves a session-only route needs from its guard.
 *
 * `preHandler` resolves the session and sets `request.userId`; `deny` sends the
 * same failure from a handler's defensive re-read of `request.userId`, which
 * the type system still sees as nullable.
 */
export interface SessionGuard {
	/** Fastify `preHandler` that authenticates the dashboard session. */
	preHandler: (
		request: FastifyRequest,
		reply: FastifyReply
	) => Promise<FastifyReply | void>;
	/** Sends the denial `preHandler` would send. */
	deny: (reply: FastifyReply) => FastifyReply;
}

/**
 * Builds the session guard the session-only route groups share.
 *
 * A dashboard session is the only credential these routes accept: the guard
 * never falls back to an API key, so an `Authorization: Bearer` credential
 * cannot reach the studio or the asset library. The resolved user id is
 * written to `request.userId`, the field `voiceAccess` reads.
 *
 * @param auth - The Better Auth server the session is resolved through.
 * @param message - Why this route group needs a session.
 * @returns The guard's `preHandler` and its matching denial.
 */
export function createSessionGuard(
	auth: AuthServer,
	message: string
): SessionGuard {
	return {
		deny: (reply) => denySession(reply, message),

		async preHandler(request, reply) {
			const session = await auth.api.getSession({
				headers: request.headers as unknown as Headers,
			});

			if (!session?.user) {
				return denySession(reply, message);
			}

			request.userId = session.user.id;
		},
	};
}
