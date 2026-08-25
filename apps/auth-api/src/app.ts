import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AutoLoad from "@fastify/autoload";
import type { FastifyPluginAsync } from "fastify";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = dirname(__filename);

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	/**
	 * Register plugins
	 */
	void fastify.register(AutoLoad, {
		dir: join(__dirname, "plugins"),
		options: { ...opts },
	});

	/**
	 * Register routes
	 */
	void fastify.register(AutoLoad, {
		dir: join(__dirname, "routes"),
		options: { ...opts },
	});
};

export default app;
