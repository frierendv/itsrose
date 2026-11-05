import "dotenv/config";
import { assertApiEnv } from "@/lib/env-check";
import { getEnv } from "@itsrose/system";
import closeWithGrace from "close-with-grace";
import Fastify from "fastify";
import fp from "fastify-plugin";
import app from "./app";

// Fail fast with every missing or malformed variable in one message.
assertApiEnv();

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
			port: getEnv("PORT", { defaultValue: "3000", preprocess: Number }),
			host: "0.0.0.0",
		});
	} catch (err) {
		void fastify.log.error(err, "Error starting server");
		void process.exit(1);
	}
}

if (import.meta.main) {
	startServer();
}
