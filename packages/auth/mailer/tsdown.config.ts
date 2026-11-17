import { config, mergeConfig } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig(
	mergeConfig(config, {
		failOnWarn: false,
		exports: {
			...(typeof config.exports === "object" ? config.exports : {}),
			customExports: (exports, { isPublish }) => ({
				...exports,
				"./plugin": isPublish
					? "./dist/plugin-server.mjs"
					: "./src/plugin-server.ts",
				"./plugin-server": isPublish
					? "./dist/plugin-server.mjs"
					: "./src/plugin-server.ts",
			}),
		},
		format: ["esm"],
		entry: [
			"src/index.ts",
			"src/client.ts",
			"src/env.ts",
			"src/renderer.ts",
			"src/service.ts",
			"src/plugin-server.ts",
			"src/types.ts",
		],
		unused: {
			ignore: [
				// `@better-auth-ui/heroui/email` imports `@better-auth-ui/react/email`
				// at runtime, and that imports `react-email`. Neither name appears
				// in this package's own source, so the scan cannot see them.
				"@better-auth-ui/react",
				"react-email",
			],
		},
	})
);
