import { fastifyConfig } from "@itsrose/tsdown-config";
import { defineConfig } from "tsdown";

export default defineConfig({
	...fastifyConfig,
	deps: {
		...fastifyConfig.deps,
		alwaysBundle: [/^@itsrose\//],
	},
});
