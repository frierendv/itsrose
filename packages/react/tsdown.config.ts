import { mergeConfig, reactConfig } from "@itsrose/tsdown-config";
import { defineConfig } from "tsdown";

export default defineConfig(
	mergeConfig(reactConfig, {
		entry: ["./src/index.ts", "./src/*/index.ts"],
	})
);
