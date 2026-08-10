/**
 * Used for better-auth db generation/migration
 */
import "dotenv/config";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { createBetterAuthServer } from "./server";
import { readEnvs, SHARED_ENV_KEYS } from "./shared/env";

const env = readEnvs(SHARED_ENV_KEYS);
export const auth = createBetterAuthServer({
	database: {
		dialect: new PostgresDialect({
			pool: async () =>
				new Pool({
					database: env.DB_NAME,
					user: env.DB_USER,
					password: env.DB_PASS,
					host: env.DB_HOST,
					port: Number(env.DB_PORT),
					ssl: env.DB_SSL === "true",
				}),
		}),
		type: "postgres",
		casing: "snake",
		transaction: true,
	},
});
