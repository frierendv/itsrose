import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AutoLoad from "@fastify/autoload";
import { FailureResponse, SuccessResponse } from "@itsrose/api-response";
import { sharedRoutes } from "@itsrose/api-routes";
import type { FastifyPluginAsync } from "fastify";
import {
	createSerializerCompiler,
	validatorCompiler,
} from "fastify-zod-openapi";
import { sharedRoutesOptions } from "./lib/shared-routes";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename);

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	/**
	 * Plugin compilers for OpenAPI validation and serialization using Zod schemas.
	 * These compilers will be used by the OpenAPI plugin to validate incoming requests
	 * and serialize outgoing responses based on the Zod schemas defined in the route handlers.
	 */
	fastify.setValidatorCompiler(validatorCompiler);
	const serializerCompiler = createSerializerCompiler({
		stringify(value) {
			if (
				value instanceof SuccessResponse ||
				value instanceof FailureResponse
			) {
				return JSON.stringify(value);
			}
			return JSON.stringify(
				new SuccessResponse({ data: value, code: "OK" })
			);
		},
	});
	fastify.setSerializerCompiler(serializerCompiler);

	/**
	 * Register OpenAPI plugin
	 */
	await fastify.register(AutoLoad, {
		dir: join(__dirname, "plugins/openapi"),
		options: { ...opts },
	});

	// #if DEV
	/** Register Scalar UI plugin */
	await fastify.register(AutoLoad, {
		dir: join(__dirname, "plugins/~dev"),
		options: { ...opts },
	});
	// #endif

	/**
	 * Register external plugins
	 */
	await fastify.register(AutoLoad, {
		dir: join(__dirname, "plugins/external"),
		options: { ...opts },
	});

	/**
	 * Register the route surface shared with apps/api
	 */
	await fastify.register(sharedRoutes, sharedRoutesOptions);

	/**
	 * Register routes
	 */
	void fastify.register(AutoLoad, {
		dir: join(__dirname, "routes"),
		options: { ...opts },
	});
};

export default app;
