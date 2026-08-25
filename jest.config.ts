import type { Config } from "jest";
import {
	createDefaultEsmPreset,
	type DefaultEsmTransformOptions,
} from "ts-jest";

const moduleNameMapper = {
	"^@itsrose/([^/]+)$": [
		"<rootDir>/packages/core/$1/src",
		"<rootDir>/packages/features/$1/src",
		"<rootDir>/packages/internal/$1/src",
		"<rootDir>/packages/others/$1/src",
		"<rootDir>/packages/shared/$1/src",
		"<rootDir>/packages/$1/src",
	],
	"^atomically$": "<rootDir>/packages/others/lowdb/__mocks__/atomically.ts",
	"^superjson$": "<rootDir>/packages/others/lowdb/__mocks__/superjson.ts",
};

const transformIgnorePatterns = [
	"/node_modules/(?!(atomically|superjson|copy-anything)/)",
];

function createProject<const Path extends `packages/${string}`>(
	rootPath: Path,
	overrides: DefaultEsmTransformOptions = {}
) {
	return {
		displayName: rootPath,
		roots: [`<rootDir>/${rootPath}`],
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
		createProject("packages/others"),
		createProject("packages/react", {
			tsconfig: "<rootDir>/packages/react/tsconfig.test.json",
		}),
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
