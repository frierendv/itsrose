/* eslint-disable @typescript-eslint/naming-convention */
import fp from "fastify-plugin";

const fastifyRequestTracker = fp(async (fastify) => {
	// Always return the request ID in response
	fastify.addHook("onSend", async (request, reply) => {
		reply.header("x-request-id", request.id);
		reply.header("x-response-time", reply.elapsedTime.toFixed(2));
	});
});

declare module "fastify" {
	interface FastifyRequest {
		startTime: number;
	}
}

export default fastifyRequestTracker;
