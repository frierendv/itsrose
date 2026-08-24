import { redisStorage } from "@better-auth/redis-storage";
import { createBetterAuthServer, type AuthServer } from "@itsrose/auth/server";
import fp from "fastify-plugin";
import { Redis } from "ioredis";
import { Pool } from "pg";

export default fp(
	async (fastify) => {
		const { env } = fastify;

		const client = env.REDIS_URL ? new Redis(env.REDIS_URL) : null;

		const secondaryStorage = client
			? redisStorage({ client, keyPrefix: "auth:" })
			: undefined;
		const trustedOrigins = env.APP_BASE_URL
			? env.APP_BASE_URL.split(",").map((origin) => origin.trim())
			: [];
		// #if DEV
		if (!trustedOrigins.length || !("localhost" in trustedOrigins)) {
			trustedOrigins.push("http://localhost:3000");
		}
		// #endif

		const auth = createBetterAuthServer({
			baseURL: env.BETTER_AUTH_BASE_URL,
			trustedOrigins,
			basePath: "/api",
			database: new Pool({
				database: env.DB_NAME,
				user: env.DB_USER,
				password: env.DB_PASS,
				host: env.DB_HOST,
				port: Number(env.DB_PORT),
				ssl: env.DB_SSL === "true",
			}),
			secondaryStorage,
		});

		void fastify.decorate("auth", auth);
	},
	{
		name: "better-auth",
		decorators: {
			/**
			 * {@linkcode apps/auth-api/src/plugins/env.ts}
			 */
			fastify: ["env"],
		},
		/**
		 * {@linkcode https://github.com/fastify/fastify-env/blob/main/index.js#L27}
		 * {@linkcode apps/auth-api/src/plugins/env.ts}
		 */
		dependencies: ["env"],
	}
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		auth: AuthServer;
	}
}
