/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fastifyAutoload } from "@fastify/autoload";
import { ERROR_CODE } from "@itsrose/http-code";
import type { FastifyInstance, FastifyPluginOptions } from "fastify";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function service(
	fastify: FastifyInstance,
	opts: FastifyPluginOptions
): Promise<void> {
	/**
	 * Register plugins
	 */

	void fastify.register(fastifyAutoload, {
		dir: join(__dirname, "plugins"),

		forceESM: true,
		options: { ...opts },
	});
	void fastify.register(fastifyAutoload, {
		dir: join(__dirname, "proxy"),
		forceESM: true,
		options: { ...opts },
	});
	// global error handler
	fastify.setErrorHandler((error, request, reply) => {
		fastify.log.error(error);
		const response = ERROR_CODE["EXTERNAL_SERVICE_ERROR"];
		reply.status(500).xml({
			Error: {
				Code: response.code,
				Message: response.message,
				RequestId: request.id,
				HostId: request.hostname,
				Resource: request.url,
			},
		});
	});
}
