import { createCreem, type Creem } from "@itsrose/auth/server";
import fp from "fastify-plugin";

export default fp(
	async (fastify) => {
		const env = fastify.env;
		const testMode = env?.NODE_ENV !== "production";
		const creemApiKey =
			(testMode
				? env.CREEM_DEVELOPMENT_API_KEY
				: env.CREEM_PRODUCTION_API_KEY) || "";

		const creem = createCreem({
			apiKey: creemApiKey,
			testMode,
		});

		void fastify.decorate("creem", creem);
	},
	{ name: "creem", dependencies: ["env"] }
);

declare module "fastify" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	interface FastifyInstance {
		creem: Creem;
	}
}
