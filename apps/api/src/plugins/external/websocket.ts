import fastifyWebsocket from "@fastify/websocket";

export const autoConfig = {
	options: { maxPayload: 1048576 },
};

/**
 * This plugin adds WebSocket support to Fastify.
 *
 * @see {@link https://github.com/fastify/fastify-websocket} for more information.
 */
export default fastifyWebsocket;
