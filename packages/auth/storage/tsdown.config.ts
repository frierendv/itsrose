import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	exports: {
		...(typeof config.exports === "object" ? config.exports : {}),
		// The application service and the Postgres adapter are grouped under
		// `src/application/` and `src/adapter/`, but their public subpaths are
		// the short `@itsrose/auth-storage/assets` and
		// `@itsrose/auth-storage/registry`.
		exclude: ["application/assets", "adapter/postgres"],
		customExports: (exports, { isPublish }) => ({
			...exports,
			"./assets": isPublish
				? "./dist/application/assets.mjs"
				: "./src/application/assets.ts",
			"./plugin": isPublish
				? "./dist/plugin-server.mjs"
				: "./src/plugin-server.ts",
			"./plugin-server": isPublish
				? "./dist/plugin-server.mjs"
				: "./src/plugin-server.ts",
			"./registry": isPublish
				? "./dist/adapter/postgres.mjs"
				: "./src/adapter/postgres.ts",
			"./schema": isPublish
				? "./dist/schema/index.mjs"
				: "./src/schema/index.ts",
		}),
	},
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/application/assets.ts",
		"src/adapter/postgres.ts",
		"src/client.ts",
		"src/env.ts",
		"src/config.ts",
		"src/keys.ts",
		"src/operations.ts",
		"src/plugin-server.ts",
		"src/schema/index.ts",
		"src/types.ts",
	],
});
