import pluginBabel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import Sonda from "sonda/rolldown";
import Macros from "unplugin-macros/rolldown";
import PreprocessorDirectives from "unplugin-preprocessor-directives/rollup";
import { purgePolyfills } from "unplugin-purge-polyfills";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_BUILD =
	process.env.BUILDING === "true" ||
	process.env.NEXT_PHASE === "phase-production-build";
const IS_CI = Boolean(process.env.CI);

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @template {import("tsdown").UserConfig} T
 * @param {T} base
 * @param {DeepPartial<T>} [overrides={}]
 * @returns {T}
 */
export function mergeConfig(base, overrides = {}) {
	const result = { ...base };

	for (const key of Object.keys(overrides /** @type {Array<keyof T>} */)) {
		const value = overrides[key];

		if (isPlainObject(result[key]) && isPlainObject(value)) {
			result[key] = {
				...result[key],
				...value,
			}; /** @type {T[typeof key]} */
		} else if (value !== undefined) {
			result[key] = value; /** @type {T[typeof key]} */
		}
	}

	return result;
}

/** @returns {import("tsdown").UserConfig} */
export function getProdConfig() {
	if (!IS_PRODUCTION) return {};
	return {
		sourcemap: true,
		minify: true,
	};
}
/** @type {import("tsdown").TsdownPluginOption} */
const plugins = [
	Macros(),
	PreprocessorDirectives(),
	purgePolyfills.rolldown({ sourcemap: true }),
	Sonda({
		// disable on production or ci
		enabled: !(IS_PRODUCTION || IS_CI),
		filename: "sonda_report",
		sources: true,
		open: false,
	}),
];

/** @type {import("tsdown").UserConfig} */
const baseConfig = {
	entry: ["src/index.ts"],
	clean: true,
	dts: {
		enabled: true,
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
		// disable on production or build phase
		devExports: !(IS_PRODUCTION || IS_BUILD),
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

export const config = mergeConfig(baseConfig, { ...getProdConfig(), plugins });

export const reactConfig = mergeConfig(baseConfig, {
	minify: false,
	platform: "neutral",
	format: "esm",
	plugins: [
		pluginBabel({
			presets: [
				reactCompilerPreset({
					compilationMode: "annotation",
					target: "19",
				}),
			],
		}),
	],
});

export const fastifyConfig = mergeConfig(config, {
	dts: false,
	entry: ["src/**/*.ts"],
	unbundle: true,
	failOnWarn: false,
	sourcemap: false,
	format: ["esm"],
	exports: false,
});
