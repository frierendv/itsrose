import Sonda from "sonda/rolldown";
import type { TsdownPluginOption, UserConfig } from "tsdown";
import Macros from "unplugin-macros/rolldown";
import PreprocessorDirectives from "unplugin-preprocessor-directives/rollup";
import { purgePolyfills } from "unplugin-purge-polyfills";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_CI = process.env.CI === "true";

function getProdConfig() {
	const prod: UserConfig = {
		// disable dts generation in production to speed up builds
		dts: false,
		sourcemap: "inline",
		// Only minify in prod
		minify: true,
	};
	return IS_PRODUCTION ? prod : {};
}
const plugins: TsdownPluginOption = [
	Macros(),
	PreprocessorDirectives(),
	purgePolyfills.rolldown({ sourcemap: true }),
	Sonda({
		enabled: !IS_PRODUCTION && !IS_CI,
		filename: "sonda_repot", // only last report needed
		sources: true,
		open: false,
	}),
];

export const config: UserConfig = {
	entry: ["src/index.ts"],
	clean: true,
	dts: {
		enabled: true,
		cjsReexport: true,
	},
	target: ["es2024"],
	format: ["cjs", "esm"],
	deps: {
		neverBundle: true,
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
	plugins,
	outExtensions: ({ format }) => {
		if (format === "cjs") {
			return { js: ".js", dts: ".d.cts" };
		}
		if (format === "es") {
			return { js: ".mjs", dts: ".d.mts" };
		}
		return {};
	},
	...getProdConfig(),
};

export const fastifyConfig: UserConfig = {
	...config,
	// no need for dts
	dts: false,
	entry: ["src/**/*.ts"],
	// no need to bundle
	unbundle: false,
	failOnWarn: false,
	sourcemap: false,
	// output only esm
	format: ["esm"],
};
