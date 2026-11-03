import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	failOnWarn: false,
	format: ["esm"],
	entry: [
		"src/index.ts",
		"src/client.ts",
		"src/renderer.ts",
		"src/service.ts",
		"src/plugin-server.ts",
		"src/types.ts",
	],
});
