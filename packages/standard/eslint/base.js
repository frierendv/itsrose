// @ts-check
import js from "@eslint/js";
import gitignore from "eslint-config-flat-gitignore";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import eslintPluginZod from "eslint-plugin-zod";
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
			// `any` is strictly prohibited.
			"@typescript-eslint/no-explicit-any": "error",
			// interfaces that merely re-declare a schema shape are banned.
			"@typescript-eslint/no-empty-object-type": "error",
		},
	},
	{
		ignores: ["dist/**"],
	},
];

/**
 * A shared ESLint configuration for zod schema.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const schemaConfig = [
	{
		plugins: {
			zod: eslintPluginZod,
		},
		rules: {
			...eslintPluginZod.configs.recommended.rules,
			"zod/consistent-object-schema-type": [
				"error",
				{ allow: ["object"] },
			],
			/**
			 * restrict `z.any`
			 */
			"zod/no-any-schema": ["error"],
			"zod/no-duplicate-schema-methods": ["error"],
			/**
			 * consistent zod schema naming; ie. NameSchema/nameSchema
			 */
			"zod/consistent-schema-var-name": ["error", { after: "Schema" }],
			/**
			 * We use v4.
			 */
			"zod/consistent-import-source": ["error", { sources: ["zod/v4"] }],
			/**
			 * named import ie. `import { z } from "zod/v4"`.
			 *
			 * Ignoring ["not treeshakable by Webpack (Next.js) and esbuild"](https://github.com/colinhacks/zod/issues/4433#issuecomment-2921500831)
			 */
			"zod/consistent-import": ["error", { syntax: "named" }],
			/** `meta` should be last. */
			"zod/prefer-meta-last": ["error"],
			/** Enforce .nullish() instead of combining .optional() and .nullable() */
			"zod/prefer-nullish": ["error"],
			/** Prefer `z.enum()` over `z.union()` when all members are string literals. */
			"zod/prefer-enum-over-literal-union": ["error"],
			/**
			 * https://github.com/marcalexiei/eslint-zod/pull/612
			 */
			"zod/consistent-object-property-key-style": [
				"error",
				{ style: "snake_case" },
			],
		},
	},
];
