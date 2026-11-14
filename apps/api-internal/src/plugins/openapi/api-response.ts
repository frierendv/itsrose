import { apiErrorHandler } from "@itsrose/api-routes";
import fp from "fastify-plugin";

export default fp(async (fastify) => {
	await fastify.register(apiErrorHandler);
});
