import { FailureResponse } from "@itsrose/api-response";
import { apiErrorHandler, type ErrorMapper } from "@itsrose/api-routes";
import {
	AssetCapExceededError,
	AssetNotFoundError,
} from "@itsrose/auth-storage/assets";
import { APIError } from "better-auth";
import type { FastifyError } from "fastify";
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

/**
 * `true` for the storage package's validation error.
 *
 * The class lives in `@itsrose/s3`, which this app does not depend on; the
 * storage package is the component that throws it, so its name is the only
 * contract available here.
 */
const isStorageValidationError = (error: FastifyError): boolean =>
	error.name === "StorageValidationError";

/**
 * Maps the durable asset domain errors to the standard failure envelope.
 *
 * `AssetCapExceededError` keeps the package's existing quota vocabulary
 * (`QUOTA_EXCEEDED`) but answers 403: the tenant is not allowed to store the
 * bytes, it did not exceed a request rate.
 */
const assetErrorMapper: ErrorMapper = (error, _request, reply) => {
	if (error instanceof AssetCapExceededError) {
		const response = FailureResponse.create({
			code: "QUOTA_EXCEEDED",
			message: error.message,
			errors: {
				storage: `The ${error.cap} allowance was exceeded.`,
			},
			meta: { cap: error.cap },
		});
		reply.status(403).send(response);
		return true;
	}

	if (error instanceof AssetNotFoundError) {
		const response = FailureResponse.create({
			code: "NOT_FOUND",
			message: error.message,
			errors: { asset_id: error.assetId },
		});
		reply.status(response.statusCode).send(response);
		return true;
	}

	if (isStorageValidationError(error)) {
		const response = FailureResponse.create({
			code: "INVALID_REQUEST",
			message: error.message,
			errors: { type: "INVALID_REQUEST" },
		});
		reply.status(response.statusCode).send(response);
		return true;
	}

	return false;
};

export default fp(async (fastify) => {
	await fastify.register(apiErrorHandler, {
		errorMappers: [betterAuthErrorMapper, assetErrorMapper],
	});
});
