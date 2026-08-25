import { createDatabasePool, type DatabasePool } from "@itsrose/auth/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const env = fastify.env;
		const database = createDatabasePool({
			database: env.DB_NAME,
			user: env.DB_USER,
			password: env.DB_PASS,
			host: env.DB_HOST,
			port: Number(env.DB_PORT),
			ssl: env.DB_SSL === "true",
		});

		void fastify.addHook("onClose", async () => {
			await database.end();
		});

		void fastify.decorate("database", database);
	},
	{
		name: "database",
		dependencies: ["env"],
	}
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		database: DatabasePool;
	}
}
