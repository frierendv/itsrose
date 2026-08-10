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
	format: ["esm"],
	entry: ["src/server.ts", "src/client.ts", "src/index.ts"],
});
