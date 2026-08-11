import Sonda from "sonda/rolldown";
import type { TsdownPluginOption, UserConfig } from "tsdown";
import Macros from "unplugin-macros/rolldown";
import PreprocessorDirectives from "unplugin-preprocessor-directives/rollup";
import { purgePolyfills } from "unplugin-purge-polyfills";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_BUILD =
	process.env.BUILDING === "true" ||
	process.env.NEXT_PHASE === "phase-production-build";
const IS_CI = Boolean(process.env.CI);

function getProdConfig(): UserConfig {
	if (!IS_PRODUCTION) return {};
	return {
		sourcemap: true,
		minify: true,
	};
}

const plugins: TsdownPluginOption = [
	Macros(),
	PreprocessorDirectives(),
	purgePolyfills.rolldown({ sourcemap: true }),
	Sonda({
		enabled: !IS_PRODUCTION && !IS_CI,
		filename: "sonda_report",
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
	exports: {
		enabled: true,
		devExports: !IS_PRODUCTION && !IS_BUILD,
		legacy: true,
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
	logLevel: "info",
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
	dts: false,
	entry: ["src/**/*.ts"],
	unbundle: true,
	failOnWarn: false,
	sourcemap: false,
	format: ["esm"],
	exports: false,
};
