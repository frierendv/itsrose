import os from "os";
import v8 from "v8";
import fastifyUnderPressure, {
	type FastifyUnderPressureOptions,
} from "@fastify/under-pressure";
import { createResponse } from "@itsrose/api-response";
import type { FastifyReply, FastifyRequest } from "fastify";

export const autoConfig: FastifyUnderPressureOptions = {
	maxEventLoopDelay: 200,
	maxEventLoopUtilization: 0.6,
	maxHeapUsedBytes: Math.round(v8.getHeapStatistics().heap_size_limit * 0.6),
	maxRssBytes: Math.round(os.totalmem() * 0.6),
	pressureHandler: (request: FastifyRequest, reply: FastifyReply) => {
		request.log.warn(
			{
				url: request.url,
				method: request.method,
				ip: request.ip,
			},
			"Server under high load, rejecting request"
		);
		void reply.status(503).send(
			createResponse.failure({
				code: "SERVICE_UNAVAILABLE",
				message: "Server is under high load, please try again.",
			})
		);
	},
};

/**
 * A Fastify plugin for mesuring process load and automatically
 * handle of "Service Unavailable"
 *
 * @see {@link https://github.com/fastify/under-pressure}
 *
 * Video on the topic: Do not thrash the event loop
 * @see {@link https://www.youtube.com/watch?v=VI29mUA8n9w}
 */
export default fastifyUnderPressure;
