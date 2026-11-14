import { FailureResponse } from "@itsrose/api-response";
import {
	InvalidRequestError,
	SystemError,
	ThirdPartyApiError,
} from "@itsrose/system";
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
 * The field a validation issue belongs to.
 *
 * The Zod issue carries the path of the offending field as an instance path
 * (`/voice_settings/speed`). A Fastify validation error that does not carry
 * one is reported under a name that says so, rather than under a field that
 * does not exist.
 *
 * @param issue - The validation issue.
 * @returns The name of the field.
 */
const validationField = (issue: {
	instancePath?: string;
	path?: readonly (string | number)[];
	message?: string;
}): string => {
	const instancePath = issue.instancePath
		? issue.instancePath.replace(/^\//, "").replace(/\//g, ".")
		: "";

	if (instancePath !== "") {
		return instancePath;
	}

	if (issue.path && issue.path.length > 0) {
		return issue.path.join(".");
	}

	return "unknown_field";
};

/**
 * The status of the error, when it carries a client error status.
 *
 * Fastify raises those for a request it refuses to read - an unsupported
 * content type, an empty body, a payload that is too large. They are the
 * caller's mistakes, not the server's, so they keep their own status.
 *
 * @param error - The error to inspect.
 * @returns The 4xx status of the error, or `undefined`.
 */
const clientErrorStatus = (error: FastifyError): number | undefined => {
	const status = (error as { statusCode?: number }).statusCode;

	return typeof status === "number" && status >= 400 && status < 500
		? status
		: undefined;
};

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
				if (error instanceof SystemError) {
					const response = new FailureResponse({
						code: "INTERNAL_ERROR",
						meta: {
							method: request.method,
							url: request.url,
							request_id: request.id,
						},
						message: error.message,
						errors: {
							type: "INTERNAL_ERROR",
						},
					});
					return reply.status(response.statusCode).send(response);
				}
				if (error.validation) {
					// map error.validation array to a json object with field name as key and error message as value
					const validationErrors: Record<string, string> = {};
					for (const err of error.validation) {
						validationErrors[validationField(err)] =
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

				const clientStatus = clientErrorStatus(error);
				if (clientStatus !== undefined) {
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
					return reply.status(clientStatus).send(response);
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
				errors: {
					type: "NOT_FOUND",
				},
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
