/**
 * Used for better-auth db generation/migration
 */
import "dotenv/config";
import {
	createBetterAuthServer,
	createDatabasePool,
	type AuthServer,
} from "./server";
import { AUTH_ENV_KEYS, readEnvs } from "./shared/env";

const env = readEnvs(AUTH_ENV_KEYS);
const database = createDatabasePool({
	database: env.DB_NAME,
	user: env.DB_USER,
	password: env.DB_PASS,
	host: env.DB_HOST,
	port: Number(env.DB_PORT),
	ssl: env.DB_SSL === "true",
});
export const auth: AuthServer = createBetterAuthServer({
	logger: { level: "error" },
	database,
});
