import {
	getSubscription,
	verifyApikey,
	type SubscriptionAccess,
} from "@/lib/auth";
import { redisStorage } from "@better-auth/redis-storage";
import { createBetterAuthServer, type AuthServer } from "@itsrose/auth/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const auth = createBetterAuthServer({
			logger: { disabled: true },
			basePath: "/api",
			database: fastify.database,
			secondaryStorage: redisStorage({
				client: fastify.redis,
				keyPrefix: "auth:",
			}),
		});

		void fastify.decorate("auth", auth.api);
		void fastify.decorate("apikey", {
			verify: (plain: string) => verifyApikey(auth, plain),
		});
		void fastify.decorate("subscription", {
			get: (userId: string) => getSubscription(fastify.database, userId),
		});
	},
	{
		name: "auth",
		dependencies: ["env", "database", "redis-storage"],
		decorators: { fastify: ["redis", "database"] },
	}
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		auth: AuthServer["api"];
		apikey: {
			verify: (plain: string) => ReturnType<typeof verifyApikey>;
		};
		subscription: {
			get: (userId: string) => Promise<SubscriptionAccess>;
		};
	}
}
