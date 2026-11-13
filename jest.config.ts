import type { Config } from "jest";
import {
	createDefaultEsmPreset,
	type DefaultEsmTransformOptions,
} from "ts-jest";

const moduleNameMapper = {
	"^@itsrose/react/(.*)$": "<rootDir>/packages/react/src/$1",
	"^@itsrose/auth-billing/plugin-server$":
		"<rootDir>/packages/auth/billing/src/plugin/plugin-server.ts",
	"^@itsrose/auth-billing/plugin-client$":
		"<rootDir>/packages/auth/billing/src/plugin/plugin-client.ts",
	"^@itsrose/auth-billing/plugin$":
		"<rootDir>/packages/auth/billing/src/plugin/plugin-server.ts",
	"^@itsrose/auth-billing/schema$":
		"<rootDir>/packages/auth/billing/src/schema/index.ts",
	"^@itsrose/auth-billing$": "<rootDir>/packages/auth/billing/src/index.ts",
	"^@itsrose/auth-billing/(.*)$": "<rootDir>/packages/auth/billing/src/$1",
	"^@itsrose/auth-usage/plugin-server$":
		"<rootDir>/packages/auth/usage/src/plugin/plugin-server.ts",
	"^@itsrose/auth-usage/plugin-client$":
		"<rootDir>/packages/auth/usage/src/plugin/plugin-client.ts",
	"^@itsrose/auth-usage/plugin$":
		"<rootDir>/packages/auth/usage/src/plugin/plugin-server.ts",
	"^@itsrose/auth-usage/schema$":
		"<rootDir>/packages/auth/usage/src/schema/index.ts",
	"^@itsrose/auth-usage/server$":
		"<rootDir>/packages/auth/usage/src/server.ts",
	"^@itsrose/auth-usage$": "<rootDir>/packages/auth/usage/src/index.ts",
	"^@itsrose/auth-usage/(.*)$": "<rootDir>/packages/auth/usage/src/$1",
	"^@itsrose/auth-mailer/plugin$":
		"<rootDir>/packages/auth/mailer/src/plugin-server.ts",
	"^@itsrose/auth-mailer$": "<rootDir>/packages/auth/mailer/src/index.ts",
	"^@itsrose/auth-mailer/(.*)$": "<rootDir>/packages/auth/mailer/src/$1",
	"^@itsrose/auth-storage/plugin$":
		"<rootDir>/packages/auth/storage/src/plugin-server.ts",
	"^@itsrose/auth-storage$": "<rootDir>/packages/auth/storage/src/index.ts",
	"^@itsrose/auth-storage/(.*)$": "<rootDir>/packages/auth/storage/src/$1",
	"^@itsrose/auth$": "<rootDir>/packages/auth/core/src/index.ts",
	"^@itsrose/auth/(.*)$": "<rootDir>/packages/auth/core/src/$1",
	"^@itsrose/([^/]+)$": [
		"<rootDir>/packages/core/$1/src",
		"<rootDir>/packages/features/$1/src",
		"<rootDir>/packages/internal/$1/src",
		"<rootDir>/packages/shared/$1/src",
		"<rootDir>/packages/$1/src",
	],
	"^better-auth/api$":
		"<rootDir>/packages/auth/core/__mocks__/better-auth-api.ts",
};

const transformIgnorePatterns = [
	"/node_modules/(?!(copy-anything|better-auth)/)",
];

function createProject<const Path extends `packages/${string}`>(
	rootPath: Path,
	overrides: DefaultEsmTransformOptions = {}
) {
	return {
		displayName: rootPath,
		roots: [`<rootDir>/${rootPath}`],
		testMatch: ["<rootDir>/packages/**/__tests__/**/*.test.[jt]s?(x)"],
		moduleNameMapper,
		transformIgnorePatterns,
		...createDefaultEsmPreset({
			tsconfig: "<rootDir>/packages/standard/typescript/node.json",
			...overrides,
		}),
	};
}

const config: Config = {
	projects: [
		createProject("packages/core"),
		createProject("packages/features"),
		createProject("packages/internal"),
		createProject("packages/shared"),
		createProject("packages/midtrans"),
		createProject("packages/auth"),
		{
			displayName: "packages/react",
			testEnvironment: "jsdom",
			setupFilesAfterEnv: ["@testing-library/jest-dom"],
			roots: ["<rootDir>/packages/react/"],
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/react/tsconfig.json",
			}),
		},
		{
			displayName: "apps/api",
			roots: ["<rootDir>/apps/api/"],
			testMatch: ["<rootDir>/apps/api/**/__tests__/**/*.test.[jt]s?(x)"],
			moduleNameMapper: {
				...moduleNameMapper,
				"^@/(.*)$": "<rootDir>/apps/api/src/$1",
			},
			transformIgnorePatterns,
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/packages/standard/typescript/node.json",
			}),
		},
		{
			displayName: "apps/dashboard",
			testEnvironment: "jsdom",
			roots: ["<rootDir>/apps/dashboard/"],
			testMatch: [
				"<rootDir>/apps/dashboard/**/__tests__/**/*.test.[jt]s?(x)",
			],
			moduleNameMapper: {
				...moduleNameMapper,
				"^@/(.*)$": "<rootDir>/apps/dashboard/$1",
				// The package ships ESM only; tests only need the route table.
				"^@better-auth-ui/core$":
					"<rootDir>/apps/dashboard/__mocks__/better-auth-ui-core.ts",
			},
			transformIgnorePatterns,
			...createDefaultEsmPreset({
				tsconfig: "<rootDir>/apps/dashboard/tsconfig.json",
			}),
		},
	],
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
};

export default config;
