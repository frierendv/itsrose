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
		ignore: ["zod", "react-dom"],
	},
	format: ["esm"],
	entry: ["src/server/index.ts", "src/react/index.ts", "src/index.ts"],
});
