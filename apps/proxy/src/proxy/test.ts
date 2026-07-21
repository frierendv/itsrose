import fastifyHttpProxy from "@fastify/http-proxy";
import fp from "fastify-plugin";
import { handleResponse } from "../utils";

export default fp(async (fastify) => {
	fastify.register(fastifyHttpProxy, {
		upstream: "https://itsrose.net",
		http2: false,
		replyOptions: {
			onResponse: handleResponse,
		},
	});
});
