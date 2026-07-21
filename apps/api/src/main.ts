import "dotenv/config";
import { generateRequestTrackingId } from "@itsrose/fastify-utils";
import closeWithGrace from "close-with-grace";
import Fastify from "fastify";
import fp from "fastify-plugin";
import app from "./app";

const fastify = Fastify({
	logger: { level: "info" },
	// Apply recommended timeouts to prevent slow or idle clients from holding connections open
	connectionTimeout: 120_000,
	requestTimeout: 60_000,
	keepAliveTimeout: 10_000,
	http: {
		headersTimeout: 15_000,
	},
	ajv: {
		customOptions: {
			allowUnionTypes: true, // Allow union types in the schema
			coerceTypes: true, // change type of data to match type keyword
			removeAdditional: "all", // Remove additional body properties
		},
	},

	trustProxy: true,
	genReqId: generateRequestTrackingId,
});

async function startServer() {
	// Register your application as a normal plugin.
	// fp must be used to override default error handler
	void fastify.register(fp(app));
	// Delay is the number of milliseconds for the graceful close to finish
	void closeWithGrace({ delay: 500 }, async ({ err }) => {
		if (err != null) {
			fastify.log.error(err);
		}

		await fastify.close();
	});

	await fastify.ready();

	try {
		// Start listening.
		await fastify.listen({
			port: 3000,
			host: "0.0.0.0",
		});
	} catch (err) {
		void fastify.log.error(err, "Error starting server");
		void process.exit(1);
	}
}

startServer();
