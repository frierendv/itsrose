import { readEnvs, SHARED_ENV_KEYS, type SharedEnv } from "@itsrose/auth";
import fp from "fastify-plugin";

const ENVS = ["PORT", ...SHARED_ENV_KEYS] as const;
export default fp(
	async (fastify) => {
		void fastify.decorate("env", readEnvs(ENVS));
	},
	{ name: "env" }
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		env: SharedEnv<typeof ENVS>;
	}
}
