import { ENVS, type ApiEnv } from "@/lib/env";
import { validateApiEnv } from "@/lib/env-check";
import { readEnvs } from "@itsrose/auth";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		void fastify.decorate("env", readEnvs(ENVS));

		// Boot validation fails fast in main.ts; warnings are logged here so
		// partially configured integrations are visible without blocking boot.
		for (const warning of validateApiEnv().warnings) {
			fastify.log.warn({ event: "env_warning" }, warning);
		}
	},
	{ name: "env" }
);

declare module "fastify" {
	interface FastifyInstance {
		env: ApiEnv;
	}
}
