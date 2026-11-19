import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	exports: {
		...(typeof config.exports === "object" ? config.exports : {}),
		// The application service is grouped under `src/application/`, but its
		// public subpath is the short `@itsrose/auth-storage/assets`.
		exclude: ["application/assets"],
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
			"./schema": isPublish
				? "./dist/schema/index.mjs"
				: "./src/schema/index.ts",
		}),
	},
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/application/assets.ts",
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
