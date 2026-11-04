import type { Config } from "jest";
import { createDefaultEsmPreset } from "ts-jest";

const config: Config = {
	displayName: "packages/internal/s3",
	testEnvironment: "node",
	testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
	coverageProvider: "v8",
	collectCoverage: true,
	collectCoverageFrom: ["src/**/*.ts", "!src/types.ts"],
	coverageDirectory: "coverage",
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	...createDefaultEsmPreset({
		tsconfig: "<rootDir>/tsconfig.json",
	}),
};

export default config;
