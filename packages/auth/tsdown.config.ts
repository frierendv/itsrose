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
		"src/server/index.ts",
		"src/react/index.ts",
		"src/itsrose/index.ts",
		"src/itsrose/client/index.ts",
		"src/itsrose/server/index.ts",
		"src/index.ts",
	],
});
