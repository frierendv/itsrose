// @ts-check
import reactHooks from "eslint-plugin-react-hooks";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for libraries that use react.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const reactConfig = [
	...baseConfig,
	{
		files: ["**/*.{js,jsx}"],
	},
	reactHooks.configs.flat.recommended,
	{
		rules: {
			// React scope no longer necessary with new JSX transform.
			"react-hooks/react-in-jsx-scope": "off",
		},
	},
];
