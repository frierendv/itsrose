import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const config = {
	projects: [
		{
			displayName: "Core",
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/esm.json",
			}),
			roots: ["<rootDir>/packages/core/"],
		},
		{
			displayName: "Features",
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/esm.json",
			}),
			roots: ["<rootDir>/packages/features/"],
		},
		{
			displayName: "Internal",
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/esm.json",
			}),
			roots: ["<rootDir>/packages/internal/"],
		},
		{
			displayName: "Shared",
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/esm.json",
			}),
			roots: ["<rootDir>/packages/shared/"],
		},
		{
			displayName: "Others",
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/esm.json",
			}),
			roots: ["<rootDir>/packages/others/"],
			transformIgnorePatterns: [
				"/node_modules/(?!(atomically|superjson|copy-anything)/)",
			],
		},
	],
	transformIgnorePatterns: [
		"/node_modules/(?!(atomically|superjson|copy-anything)/)",
	],
	moduleNameMapper: {
		"^atomically$":
			"<rootDir>/packages/others/lowdb/__mocks__/atomically.ts",
		"^superjson$": "<rootDir>/packages/others/lowdb/__mocks__/superjson.ts",
	},
	coverageProvider: "v8",
	coverageDirectory: "<rootDir>/coverage",
	coverageThreshold: {
		global: {
			branches: 80,
			functions: 80,
			lines: 80,
			statements: 80,
		},
	},
} satisfies Config;

export default config;
