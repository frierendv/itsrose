import { FailureResponse } from "@itsrose/api-response";
import { apiErrorHandler, type ErrorMapper } from "@itsrose/api-routes";
import { APIError } from "better-auth";
import fp from "fastify-plugin";

/**
 * Maps the errors Better Auth raises to the standard failure envelope.
 *
 * The mapping itself lives in the shared error handler; only the error this
 * app knows about and the other one does not is defined here.
 */
const betterAuthErrorMapper: ErrorMapper = (error, _request, reply) => {
	if (!(error instanceof APIError)) {
		return false;
	}

	const response = FailureResponse.create({
		code: "BAD_REQUEST",
		message: error.message,
		errors: {},
	});
	reply.status(error.statusCode).send(response);
	return true;
};

export default fp(async (fastify) => {
	await fastify.register(apiErrorHandler, {
		errorMappers: [betterAuthErrorMapper],
	});
});
