import { config } from "@itsrose/tsdown-config";
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
		"src/product/index.ts",
		"src/index.ts",
	],
});
