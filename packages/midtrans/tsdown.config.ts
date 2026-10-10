import { config, mergeConfig } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig(
	mergeConfig(config, {
		entry: {
			index: "./src/index.ts",
			api: "./src/api/index.ts",
			client: "./src/client/index.ts",
			helper: "./src/helper/index.ts",
			schema: "./src/schema/index.ts",
			typings: "./src/typings/index.ts",
		},
		format: "es",
	})
);
