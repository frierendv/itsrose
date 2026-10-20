import fastifyIp, { type FastifyIPOptions } from "fastify-ip";

export const autoConfig: FastifyIPOptions = {
	order: ["cf-connecting-ip", "Cf-Pseudo-IPv4", "x-real-ip", "x-client-ip"],
	strict: false,
};

export default fastifyIp;
