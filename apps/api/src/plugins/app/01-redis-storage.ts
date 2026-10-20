import { CACHE_KEYS, CACHE_TTL } from "@/lib/cache";
import fp from "fastify-plugin";
import { Redis } from "ioredis";

export default fp(
	async (fastify) => {
		const redis = new Redis(fastify.env.REDIS_URL as string);

		redis.CACHE_KEYS = CACHE_KEYS;
		redis.CACHE_TTL = CACHE_TTL;

		void fastify.addHook("onClose", async () => {
			await redis.quit();
		});

		void fastify.decorate("redis", redis);
	},
	{ name: "redis-storage", dependencies: ["env"] }
);

declare module "fastify" {
	interface FastifyInstance {
		redis: Redis;
	}
}

declare module "ioredis" {
	interface Redis {
		CACHE_KEYS: typeof CACHE_KEYS;
		CACHE_TTL: typeof CACHE_TTL;
	}
}
