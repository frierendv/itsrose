import { config } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig({
	...config,
	entry: [
		"src/index.ts",
		"src/audio/index.ts",
		"src/character-ai/index.ts",
		"src/instagram/index.ts",
		"src/mtxx/index.ts",
		"src/remini/index.ts",
		"src/tiktok/index.ts",
	],
});
