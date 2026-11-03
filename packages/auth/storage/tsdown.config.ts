import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	exports: {
		...(typeof config.exports === "object" ? config.exports : {}),
		customExports: (exports, { isPublish }) => ({
			...exports,
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
		"src/client.ts",
		"src/config.ts",
		"src/keys.ts",
		"src/operations.ts",
		"src/plugin-server.ts",
		"src/types.ts",
	],
});
