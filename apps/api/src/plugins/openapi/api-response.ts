import { createResponse, FailureResponse } from "@itsrose/api-response";
import { InvalidRequestError, ThirdPartyApiError } from "@itsrose/system";
import type { FastifyError } from "fastify";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	fastify.decorate("createResponse", createResponse);

	void fastify.setErrorHandler((error: FastifyError, request, reply) => {
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
			return reply.status(response.statusCode).send(response);
		}
		if (error.validation) {
			// map error.validation array to a json object with field name as key and error message as value
			const validationErrors: Record<string, string> = {};
			for (const err of error.validation) {
				const field = err.instancePath
					? err.instancePath.substring(1)
					: "unknown_field";
				validationErrors[field] = err.message || "Validation error";
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

		fastify.log.error(error, error.name || "Unknown error");

		reply.status(response.statusCode).send(response);
	});
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
});

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		createResponse: typeof createResponse;
	}
}
