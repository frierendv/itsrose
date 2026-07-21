import helmet, { type FastifyHelmetOptions } from "@fastify/helmet";

export const autoConfig: FastifyHelmetOptions = {
	contentSecurityPolicy: {
		useDefaults: false,
		reportOnly: true,
		directives: {
			"default-src": ["'self'"],
			"script-src": ["'self'", "'unsafe-inline'"],
		},
	},
	dnsPrefetchControl: {
		allow: true,
	},
	referrerPolicy: { policy: "no-referrer" },
	xssFilter: true,
	noSniff: true,
	frameguard: { action: "deny" },
	hsts: {
		maxAge: 31536000,
		includeSubDomains: true,
		preload: true,
	},
};

/**
 * This plugins sets the basic security headers.
 *
 * @see {@link https://github.com/fastify/fastify-helmet}
 */
export default helmet;
