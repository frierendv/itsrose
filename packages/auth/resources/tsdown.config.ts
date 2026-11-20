import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	exports: {
		...(typeof config.exports === "object" ? config.exports : {}),
		// The application services and the Postgres adapter are grouped under
		// `src/application/` and `src/adapter/`, but their public subpaths are
		// the short `@itsrose/auth-resources/generations`,
		// `@itsrose/auth-resources/voices` and
		// `@itsrose/auth-resources/registry`.
		exclude: [
			"application/generations",
			"application/voices",
			"adapter/postgres",
		],
		customExports: (exports, { isPublish }) => ({
			...exports,
			"./generations": isPublish
				? "./dist/application/generations.mjs"
				: "./src/application/generations.ts",
			"./registry": isPublish
				? "./dist/adapter/postgres.mjs"
				: "./src/adapter/postgres.ts",
			"./schema": isPublish
				? "./dist/schema/index.mjs"
				: "./src/schema/index.ts",
			"./voices": isPublish
				? "./dist/application/voices.mjs"
				: "./src/application/voices.ts",
			"./plugin": isPublish
				? "./dist/plugin-server.mjs"
				: "./src/plugin-server.ts",
			"./plugin-server": isPublish
				? "./dist/plugin-server.mjs"
				: "./src/plugin-server.ts",
		}),
	},
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/adapter/postgres.ts",
		"src/application/generations.ts",
		"src/application/voices.ts",
		"src/plugin-server.ts",
		"src/schema/index.ts",
		"src/types.ts",
	],
});
