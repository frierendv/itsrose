import "dotenv/config";
import { generateRequestTrackingId } from "@itsrose/fastify-utils";
import { logLevels, pinoTransport } from "@itsrose/logger";
import Fastify from "fastify";
import fp from "fastify-plugin";
import app from "./app";

const server = Fastify({
	logger: {
		level: "info",
		stream: pinoTransport({ customLevels: logLevels }),
	},
	// Apply recommended timeouts to prevent slow or idle clients from holding connections open
	connectionTimeout: 120_000,
	requestTimeout: 60_000,
	keepAliveTimeout: 10_000,
	http: {
		headersTimeout: 15_000,
	},
	genReqId: generateRequestTrackingId,
});
async function startServer() {
	void server.register(fp(app));

	await server.ready();

	try {
		// Start listening.
		await server.listen({
			port: Number(process.env!.PORT) || 3000,
			host: "0.0.0.0",
		});
	} catch (err) {
		console.error("Error starting server:", err);
		void server.log.error(err);
		void process.exit(1);
	}
}

startServer();
