import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyPluginOptions,
} from "fastify";

/**
 * Registers one route module on an application.
 *
 * The module is registered with the options it was handed: the prefix, the
 * description overrides and the storage decision are data, not structure.
 *
 * The helper exists so every application mounts its modules the same way.
 * It is not a gate: an application may also call `fastify.register` with the
 * module directly - the prefix claim protects both paths.
 *
 * @param fastify - The Fastify instance the module is registered on.
 * @param plugin - The plugin of the module.
 * @param options - The options of the module.
 */
export const registerRouteModule = async <
	TOptions extends FastifyPluginOptions,
>(
	fastify: FastifyInstance,
	plugin: FastifyPluginAsync<TOptions>,
	options: TOptions
): Promise<void> => {
	await fastify.register(plugin, options);
};
