import cors, { type FastifyCorsOptions } from "@fastify/cors";

export const autoConfig: FastifyCorsOptions = {
	origin: "*",
	methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
};

/**
 * This plugins enables the use of CORS.
 *
 * @see {@link https://github.com/fastify/fastify-cors}
 */
export default cors;
