// @ts-check
import js from "@eslint/js";
import gitignore from "eslint-config-flat-gitignore";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	gitignore({ recursive: true }),
	{
		plugins: {
			turbo: turboPlugin,
		},
		languageOptions: {
			ecmaVersion: "latest",
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
			},
			sourceType: "module",
		},
		rules: {
			"turbo/no-undeclared-env-vars": "warn",
			curly: ["error", "all"],
			"no-else-return": ["error", { allowElseIf: false }],
			quotes: ["error", "double", { avoidEscape: true }],
			camelcase: [
				"error",
				{
					properties: "never",
					ignoreDestructuring: true,
					ignoreImports: true,
					allow: ["^[a-z]+(_[a-z]+)+$"],
				},
			],
			semi: ["error", "always"],
			"space-before-function-paren": ["off"],
			"arrow-parens": ["error", "always"],
			"no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
			"no-unused-vars": "off", // Disable the base rule
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					vars: "all",
					args: "after-used",
					ignoreRestSiblings: true,
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrors: "all",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/naming-convention": [
				"error",
				{
					selector: ["interface", "typeLike"],
					format: ["PascalCase"],
				},
				{
					selector: "variable",
					modifiers: ["destructured"],
					format: [
						"camelCase",
						"UPPER_CASE",
						"PascalCase",
						"snake_case",
					],
				},
				{
					selector: "variable",
					format: ["camelCase", "UPPER_CASE", "PascalCase"],
				},
			],
			"@typescript-eslint/no-empty-object-type": ["off"],

			// disable any rule that is already covered by typescript
			"@typescript-eslint/no-explicit-any": "off",
		},
	},
	{
		ignores: ["dist/**"],
	},
];
