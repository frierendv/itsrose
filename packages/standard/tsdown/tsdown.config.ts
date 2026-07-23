import Sonda from "sonda/rolldown";
import type { UserConfig } from "tsdown";
import Macros from "unplugin-macros/rolldown";
import PreprocessorDirectives from "unplugin-preprocessor-directives/rollup";

const productionConfig = {
	// disable dts generation in production to speed up builds
	dts: false,
	// source maps are not needed in production
	sourcemap: false,
	// Only minify in prod
	minify: true,
} satisfies UserConfig;

export const config: UserConfig = {
	entry: ["src/index.ts"],
	clean: true,
	dts: {
		// tsgo: true,
		enabled: true,
		cjsReexport: true,
	},
	target: ["es2024"],
	format: ["cjs", "esm"],
	deps: {
		skipNodeModulesBundle: true,
	},
	cjsDefault: true,
	unused: {
		enabled: true,
		level: "warning",
		depKinds: ["dependencies", "peerDependencies"],
	},
	treeshake: true,
	unbundle: false,
	outputOptions: {
		comments: {
			legal: false,
			annotation: true,
			jsdoc: false,
		},
	},
	failOnWarn: true,
	sourcemap: true,
	logLevel: "silent",
	...getProd(),
	plugins: [
		Macros(),
		PreprocessorDirectives(),
		Sonda({
			filename: "sonda_repot", // only last report needed
			sources: true,
			open: false,
		}),
	],
	outExtensions: ({ format }) => {
		if (format === "cjs") {
			return { js: ".js", dts: ".d.cts" };
		}
		if (format === "es") {
			return { js: ".mjs", dts: ".d.mts" };
		}
		return {};
	},
};

export const fastifyConfig: UserConfig = {
	...config,
	entry: ["src/**/*.ts"],
	// no need for dts
	failOnWarn: false,
	sourcemap: "inline",
	// output only esm
	format: ["esm"],
};

function getProd() {
	return process.env.NODE_ENV === "production" ? productionConfig : {};
}
