import fastifyIp from "fastify-ip";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	void fastify.register(fastifyIp, {
		order: [
			"cf-connecting-ip",
			"Cf-Pseudo-IPv4",
			"x-real-ip",
			"x-client-ip",
		],
		strict: false,
	});

	void fastify.addHook("onSend", async (request, reply) => {
		void reply.header("x-connecting-ip", request.ip || "unknown");
	});
});
