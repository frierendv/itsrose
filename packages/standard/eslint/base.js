// @ts-check
import js from "@eslint/js";
import gitignore from "eslint-config-flat-gitignore";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Property names that are valid `snake_case` API payload keys.
 *
 * Digits are allowed inside a segment (`s3_key`), and a leading underscore is
 * allowed for keys that would otherwise collide with a JavaScript identifier.
 */
const SNAKE_CASE_KEY = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

/**
 * Zod factory calls that declare the shape of a payload.
 *
 * `object` covers `z.object()`, `strictObject` and `looseObject`; `extend` and
 * `merge` refine an existing payload shape and therefore carry payload keys
 * as well.
 */
const ZOD_SHAPE_FACTORIES = new Set([
	"object",
	"strictObject",
	"looseObject",
	"extend",
	"merge",
]);

/**
 * Local ESLint plugin enforcing the `snake_case` API payload convention from
 * AGENTS.md §5.1.
 *
 * The rule only inspects keys of Zod object schemas (`z.object({ ... })` and
 * the `extend`/`merge` refinements of such a schema), because those schemas
 * are the wire contract of the API. Ordinary object literals — React props,
 * configuration objects, third-party SDK payloads — are deliberately left
 * alone: flagging them would produce false positives and the rule would be
 * switched off again.
 *
 * @type {import("eslint").ESLint.Plugin}
 */
const snakeCasePayloadPlugin = {
	rules: {
		"snake-case-payload": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Enforce snake_case keys in API payload schemas (AGENTS.md §5.1)",
				},
				schema: [
					{
						type: "object",
						properties: {
							allow: {
								type: "array",
								items: { type: "string" },
							},
						},
						additionalProperties: false,
					},
				],
				messages: {
					notSnakeCase:
						"API payload key '{{name}}' must use snake_case (AGENTS.md §5.1).",
				},
			},
			/**
			 * @param {import("eslint").Rule.RuleContext} context
			 */
			create(context) {
				const options = context.options[0] ?? {};
				/** @type {string[]} */
				const allow = options.allow ?? [];

				/**
				 * Reads the literal name of a schema property.
				 *
				 * @param {import("estree").Property} property
				 * @returns {string | null}
				 */
				const readKey = (property) => {
					if (property.computed) {
						return null;
					}

					if (property.key.type === "Identifier") {
						return property.key.name;
					}

					if (
						property.key.type === "Literal" &&
						typeof property.key.value === "string"
					) {
						return property.key.value;
					}

					return null;
				};

				/**
				 * Reports every non `snake_case` key of a payload schema.
				 *
				 * @param {import("estree").ObjectExpression} objectExpression
				 */
				const checkPayload = (objectExpression) => {
					for (const property of objectExpression.properties) {
						if (property.type !== "Property") {
							continue;
						}

						const name = readKey(property);
						if (name === null || allow.includes(name)) {
							continue;
						}

						if (!SNAKE_CASE_KEY.test(name)) {
							context.report({
								node: property.key,
								messageId: "notSnakeCase",
								data: { name },
							});
						}
					}
				};

				/**
				 * Detects a call that produces (or refines) a Zod object schema.
				 *
				 * @param {import("estree").Node} node
				 * @returns {boolean}
				 */
				const isZodShapeCall = (node) => {
					if (node.type !== "CallExpression") {
						return false;
					}

					const callee = node.callee;
					if (callee.type !== "MemberExpression") {
						return false;
					}

					if (callee.property.type !== "Identifier") {
						return false;
					}

					const factory = callee.property.name;
					if (!ZOD_SHAPE_FACTORIES.has(factory)) {
						return false;
					}

					if (factory === "extend" || factory === "merge") {
						return isZodShapeCall(callee.object);
					}

					return true;
				};

				return {
					CallExpression(node) {
						if (!isZodShapeCall(node)) {
							return;
						}

						const [firstArgument] = node.arguments;
						if (
							!firstArgument ||
							firstArgument.type !== "ObjectExpression"
						) {
							return;
						}

						checkPayload(firstArgument);
					},
				};
			},
		},
	},
};

/**
 * ESLint configuration enforcing the `snake_case` API payload convention
 * (AGENTS.md §5.1).
 *
 * It is exported separately from {@linkcode config} because the convention
 * only applies to the API-facing packages (`apps/api`, `apps/api-internal`,
 * `packages/features/*` and `packages/auth/*`). Frontend applications
 * (`apps/dashboard`, `apps/web`) legitimately use camelCase, and upstream
 * payload schemas that mirror a third-party contract are excluded explicitly
 * at the call site.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const snakeCasePayloadConfig = [
	{
		plugins: {
			"@itsrose": snakeCasePayloadPlugin,
		},
		rules: {
			"@itsrose/snake-case-payload": "error",
		},
	},
];

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
			// AGENTS.md §5.2 — "any" is strictly prohibited.
			"@typescript-eslint/no-explicit-any": "error",
			// AGENTS.md §5.2 — Zod is the single source of truth; empty
			// interfaces that merely re-declare a schema shape are banned.
			"@typescript-eslint/no-empty-object-type": "error",
		},
	},
	{
		ignores: ["dist/**"],
	},
];
