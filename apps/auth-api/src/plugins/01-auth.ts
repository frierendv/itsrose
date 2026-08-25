import { redisStorage } from "@better-auth/redis-storage";
import { createBetterAuthServer, type AuthServer } from "@itsrose/auth/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const trustedOrigins = fastify.env.APP_BASE_URL
			? fastify.env.APP_BASE_URL.split(",").map((origin) => origin.trim())
			: [];
		// #if DEV
		if (!trustedOrigins.length || !("localhost" in trustedOrigins)) {
			trustedOrigins.push("http://localhost:3000");
		}
		// #endif

		const auth = createBetterAuthServer({
			baseURL: fastify.env.BETTER_AUTH_BASE_URL,
			trustedOrigins,
			basePath: "/api",
			database: fastify.database,
			secondaryStorage: redisStorage({
				client: fastify.redis,
				keyPrefix: "auth:",
			}),
		});

		void fastify.decorate("auth", auth);
	},
	{
		name: "auth",
		/**
		 * {@linkcode https://github.com/fastify/fastify-env/blob/main/index.js#L27}
		 * {@linkcode apps/auth-api/src/plugins/env.ts}
		 */
		dependencies: ["env", "redis-storage", "database", "@fastify/cors"],
	}
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		auth: AuthServer;
	}
}
