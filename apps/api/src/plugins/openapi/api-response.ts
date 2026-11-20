import { FailureResponse } from "@itsrose/api-response";
import { apiErrorHandler, type ErrorMapper } from "@itsrose/api-routes";
import {
	VoiceAccessDeniedError,
	VoiceAccessUnavailableError,
} from "@itsrose/api-routes/audio";
import { VoiceNotFoundError } from "@itsrose/auth-resources/voices";
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

/**
 * Maps the voice ledger and voice-access errors to the standard failure
 * envelope.
 *
 * `VoiceNotFoundError` is the ledger's single answer for "missing", "deleted"
 * and "owned by someone else": the service scopes the lookup by the caller's
 * user id, so the route never learns which case it was, and neither does the
 * caller. `VoiceAccessDeniedError` keeps that property on the synthesis
 * surface: it is raised for a foreign clone and for an unknown id alike, with
 * one message, so the route is not an existence oracle.
 *
 * `VoiceAccessUnavailableError` answers 501: the route exists but this
 * deployment did not compose the ownership port, and pretending the URL is
 * absent (404) would hide a wiring mistake from the operator.
 */
const voiceErrorMapper: ErrorMapper = (error, _request, reply) => {
	if (error instanceof VoiceNotFoundError) {
		const response = FailureResponse.create({
			code: "NOT_FOUND",
			message: error.message,
			errors: { voice_id: error.providerResourceId },
		});
		reply.status(response.statusCode).send(response);
		return true;
	}

	if (error instanceof VoiceAccessDeniedError) {
		const response = FailureResponse.create({
			code: "FORBIDDEN",
			// One message for "not yours" and "does not exist": the caller
			// must not learn which voices exist in the platform account.
			message: "The requested voice is not available to this caller.",
			errors: { voice_id: error.voiceId },
		});
		reply.status(403).send(response);
		return true;
	}

	if (error instanceof VoiceAccessUnavailableError) {
		const response = FailureResponse.create({
			code: "NOT_IMPLEMENTED",
			message: error.message,
			errors: {
				voice_access:
					"This deployment does not enforce voice ownership.",
			},
		});
		reply.status(501).send(response);
		return true;
	}

	return false;
};

export default fp(async (fastify) => {
	await fastify.register(apiErrorHandler, {
		errorMappers: [
			betterAuthErrorMapper,
			assetErrorMapper,
			voiceErrorMapper,
		],
	});
});
