import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	deps: {
		...config.deps,
		dts: {
			neverBundle: true,
		},
	},
	unused: {
		enabled: true,
		ignore: ["zod"],
	},
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/server.ts",
		"src/client/index.ts",
		"src/plugin/plugin-server.ts",
		"src/plugin/plugin-client.ts",
		"src/schema/index.ts",
		"src/types.ts",
	],
});
