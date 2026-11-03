import cors, { type FastifyCorsOptions } from "@fastify/cors";

export const autoConfig: FastifyCorsOptions = {
	delegator: async (req, callback) => {
		if (req.url.startsWith("/auth")) {
			return callback(null, {
				origin: true,
				methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
				allowedHeaders: [
					"Content-Type",
					"Authorization",
					"X-Requested-With",
				],
				credentials: true,
				maxAge: 86400,
			});
		}
		return callback(null, {
			origin: true,
			methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
			exposedHeaders: [
				// Rate limit headers
				"x-ratelimit-remaining",
				"x-ratelimit-reset",

				// Tracing and error headers
				"x-trace-id",
				"x-request-id",
				"x-correlation-id",

				// Custom headers
				"x-connecting-ip",
				"x-processing-time",
				"x-response-time",
			],
		});
	},
};

/**
 * This plugins enables the use of CORS.
 *
 * @see {@link https://github.com/fastify/fastify-cors}
 */
export default cors;
