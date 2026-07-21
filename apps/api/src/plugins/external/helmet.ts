import helmet, { type FastifyHelmetOptions } from "@fastify/helmet";

export const autoConfig: FastifyHelmetOptions = {
	contentSecurityPolicy: false,

	crossOriginEmbedderPolicy: false,

	hsts: {
		maxAge: 31536000, // 1 year
		includeSubDomains: true,
		preload: true,
	},

	referrerPolicy: {
		policy: "no-referrer",
	},
};

/**
 * This plugins sets the basic security headers.
 *
 * @see {@link https://github.com/fastify/fastify-helmet}
 */
export default helmet;
