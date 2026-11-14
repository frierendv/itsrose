import { FailureResponse } from "@itsrose/api-response";
import { InvalidRequestError, ThirdPartyApiError } from "@itsrose/system";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

/**
 * Maps an error that the shared handler does not know about.
 *
 * A mapper sends the response itself and returns `true` when it handled the
 * error; returning `false` hands the error to the next mapper and, finally,
 * to the catch-all of the shared handler.
 */
export type ErrorMapper = (
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply
) => boolean;

/**
 * Options of the shared error handler.
 */
export interface ApiErrorHandlerOptions {
	/**
	 * Mappers for the errors that only one of the apps knows about.
	 *
	 * They run after the errors the shared handler knows and before the
	 * catch-all, in the order they are given.
	 */
	errorMappers?: ErrorMapper[];
}

/**
 * Maps every error to the standard failure envelope.
 *
 * The mapping is the same for `apps/api` and `apps/api-internal`; the errors
 * that only one of them raises are supplied by that app as an extra mapper.
 */
export const apiErrorHandler = fp(
	async (fastify, opts: ApiErrorHandlerOptions): Promise<void> => {
		void fastify.setErrorHandler(
			(error: FastifyError, request, reply): FastifyReply | undefined => {
				if (error instanceof FailureResponse) {
					const response = error as FailureResponse<unknown>;
					return reply.status(response.statusCode).send(error);
				}
				if (error instanceof ThirdPartyApiError) {
					const response = new FailureResponse({
						code: "EXTERNAL_SERVICE_ERROR",
						meta: {
							method: request.method,
							url: request.url,
							request_id: request.id,
						},
						message: error.message,
						errors: {
							type: "EXTERNAL_SERVICE_ERROR",
						},
					});
					return reply.status(error.statusCode).send(response);
				}
				if (error instanceof InvalidRequestError) {
					const response = new FailureResponse({
						code: "INVALID_REQUEST",
						meta: {
							method: request.method,
							url: request.url,
							request_id: request.id,
						},
						message: error.message,
						errors: {
							type: "INVALID_REQUEST",
						},
					});
					return reply.status(error.statusCode).send(response);
				}
				if (error.validation) {
					// map error.validation array to a json object with field name as key and error message as value
					const validationErrors: Record<string, string> = {};
					for (const err of error.validation) {
						const field = err.instancePath
							? err.instancePath.substring(1)
							: "unknown_field";
						validationErrors[field] =
							err.message || "Validation error";
					}

					const response = new FailureResponse({
						code: "VALIDATION_ERROR",
						meta: {
							method: request.method,
							url: request.url,
							request_id: request.id,
						},
						message: error.message,
						errors: validationErrors,
					});
					return reply.status(response.statusCode).send(response);
				}

				for (const mapper of opts.errorMappers ?? []) {
					if (mapper(error, request, reply)) {
						return reply;
					}
				}

				const response = new FailureResponse({
					code: "UNHANDLED_EXCEPTION",
					meta: {
						method: request.method,
						url: request.url,
						request_id: request.id,
					},
					errors: {
						type: "UNHANDLED_EXCEPTION",
					},
				});

				void request.log.error(error, error.name || "Unknown error");

				reply.status(response.statusCode).send(response);
			}
		);
		void fastify.setNotFoundHandler((request, reply) => {
			const response = new FailureResponse({
				code: "NOT_FOUND",
				errors: {},
				meta: {
					method: request.method,
					url: request.url,
					request_id: request.id,
				},
			});

			reply.status(response.statusCode).send(response);
		});
	},
	{ name: "api-error-handler" }
);
