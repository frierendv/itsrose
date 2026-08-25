import fp from "fastify-plugin";
import { Redis } from "ioredis";

export default fp(
	async (fastify) => {
		const redis = new Redis(fastify.env.REDIS_URL as string);

		void fastify.addHook("onClose", async () => {
			await redis.quit();
		});

		void fastify.decorate("redis", redis);
	},
	{ name: "redis-storage", dependencies: ["env"] }
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		redis: Redis;
	}
}
