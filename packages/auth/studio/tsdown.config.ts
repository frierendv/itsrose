import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	exports: {
		...(typeof config.exports === "object" ? config.exports : {}),
		// The application service and the Postgres adapter are grouped under
		// `src/application/` and `src/adapter/`, but their public subpaths are
		// the short `@itsrose/auth-studio/voices` and
		// `@itsrose/auth-studio/registry`.
		exclude: ["application/voices", "adapter/postgres"],
		customExports: (exports, { isPublish }) => ({
			...exports,
			"./registry": isPublish
				? "./dist/adapter/postgres.mjs"
				: "./src/adapter/postgres.ts",
			"./schema": isPublish
				? "./dist/schema/index.mjs"
				: "./src/schema/index.ts",
			"./voices": isPublish
				? "./dist/application/voices.mjs"
				: "./src/application/voices.ts",
		}),
	},
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/adapter/postgres.ts",
		"src/application/voices.ts",
		"src/schema/index.ts",
		"src/types.ts",
	],
});
