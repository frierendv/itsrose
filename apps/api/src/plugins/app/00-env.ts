import { ENVS, type ApiEnv } from "@/lib/env";
import { readEnvs } from "@itsrose/auth";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		void fastify.decorate("env", readEnvs(ENVS));
	},
	{ name: "env" }
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		env: ApiEnv;
	}
}
