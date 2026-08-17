// @ts-check
import { globalIgnores } from "eslint/config";
import { config as baseConfig } from "./base.js";
import { reactConfig } from "./react-internal.js";

/**
 * A custom ESLint configuration for libraries that use Next.js.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nextJsConfig = [
	globalIgnores([
		// Default ignores of eslint-config-next:
		".next/**",
		"out/**",
		"build/**",
		"next-env.d.ts",
	]),
	...baseConfig,
	...reactConfig,
];
