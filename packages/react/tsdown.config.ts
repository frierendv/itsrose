import { mergeConfig, reactConfig } from "@itsrose/standard/tsdown";
import { defineConfig } from "tsdown";

export default defineConfig(
	mergeConfig(reactConfig, {
		exports: {
			packageJson: false,

			customExports: (exports, { isPublish }) => {
				Object.assign(exports, {
					// on publish use dist
					"./styles": `./${isPublish ? "dist" : "src"}/styles/index.css`,
					"./package.json": "./package.json",
				});
				return exports;
			},
		},
		inputOptions: {
			onLog(level, log, defaultHandler) {
				if (log.code === "MODULE_LEVEL_DIRECTIVE") {
					return;
				}
				defaultHandler(level, log);
			},
		},
		outputOptions: {
			exports: "named",
			preserveModules: true,
		},
		unused: { enabled: true, ignore: ["react-dom", "tailwindcss"] },
		copy: ["./src/styles"],
		entry: {
			index: "./src/index.ts",
			core: "./src/core/index.ts",
			utils: "./src/utils/index.ts",
			"hooks/*": ["./src/hooks/*.ts", "!./src/hooks/index.ts"],
			"*": "./src/components/*/index.ts",
		},
	})
);
