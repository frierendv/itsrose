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

/**
 * The set of source files the coverage gate is allowed to see.
 *
 * Under the `v8` provider Jest only reports files that were actually loaded
 * by a test, so a package without a single test is invisible to the gate
 * instead of being reported as uncovered. `collectCoverageFrom` widens the
 * denominator to the whole source tree: every file matched here is reported,
 * whether or not a test ever imported it.
 *
 * Extension choices:
 * - `.ts` / `.tsx`: every runtime source file in this repo.
 * - `.js` / `.jsx`: included for parity; there are none under the matched
 *   directories today, but a stray one must not silently escape the gate.
 * - `.astro` (apps/waf-page): excluded. Astro components are not
 *   transformable by ts-jest and `apps/waf-page` has no Jest project.
 * - `.mjs` / `.cjs`: excluded. They only occur in build/tooling config
 *   (packages/standard, astro.config.mjs), never in shipped runtime code.
 * - `.json`, `.css`, `.md`: not code, never instrumented by Jest.
 *
 * Deliberate directory exclusions:
 * - `packages/types`: zero-runtime, type-only package. There is no executable
 *   statement to cover.
 * - `packages/standard`: shared tooling presets (tsdown/ESLint/TS configs),
 *   no runtime source.
 * - `__tests__` / `__mocks__`: test scaffolding, not shipped code.
 * - `next.config.*`, `eslint.config.*`, `tsdown.config.*`, `*.d.ts`:
 *   configuration and ambient declarations.
 */
const collectCoverageFrom = [
	"packages/*/src/**/*.{ts,tsx,js,jsx}",
	"packages/*/*/src/**/*.{ts,tsx,js,jsx}",
	"packages/*/tools/**/*.{ts,tsx,js,jsx}",
	"apps/*/src/**/*.{ts,tsx,js,jsx}",
	"apps/*/{app,components,config,constants,features,hooks,layouts,lib,providers,server,shared,types}/**/*.{ts,tsx,js,jsx}",
	"apps/*/proxy.{ts,tsx,js,jsx}",
	"apps/*/mdx-components.{ts,tsx,js,jsx}",
	"!packages/types/**",
	"!packages/standard/**",
	"!**/__tests__/**",
	"!**/__mocks__/**",
	"!**/next.config.{ts,tsx,js,jsx}",
	"!**/eslint.config.{ts,tsx,js,jsx}",
	"!**/tsdown.config.{ts,tsx,js,jsx}",
	"!**/*.d.ts",
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

/**
 * Per-package coverage floors.
 *
 * Every number below was measured with `collectCoverageFrom` in place, i.e.
 * against the real denominator (the whole source tree), not the flattering
 * "only files a test happened to load" set. Each floor is set at or just
 * below the measured value, so the gate is green today and turns red the
 * moment a package regresses.
 *
 * The per-path groups are the real signal: a single global number cannot
 * describe a tree where one app is at 100% and another has no tests at all.
 */
const perPathCoverageThresholds = {
	"./packages/auth/": {
		branches: 60,
		functions: 58,
		lines: 58,
		statements: 58,
	},
	"./packages/features/": {
		branches: 74,
		functions: 53,
		lines: 48,
		statements: 48,
	},
	"./packages/internal/": {
		branches: 88,
		functions: 80,
		lines: 80,
		statements: 80,
	},
	"./packages/midtrans/": {
		branches: 83,
		functions: 87,
		lines: 80,
		statements: 80,
	},
	"./packages/react/": {
		branches: 70,
		functions: 37,
		lines: 31,
		statements: 31,
	},
	"./apps/api/": {
		branches: 41,
		functions: 9,
		lines: 9,
		statements: 9,
	},
	"./apps/dashboard/": {
		branches: 57,
		functions: 22,
		lines: 11,
		statements: 11,
	},
	"./apps/api-internal/": {
		branches: 0,
		functions: 0,
		lines: 0,
		statements: 0,
	},
	"./apps/web/": {
		branches: 0,
		functions: 0,
		lines: 0,
		statements: 0,
	},
};

/**
 * The projects a path floor belongs to.
 *
 * Used so that a run targeting a subset of projects enforces the floor of
 * the project it is working on, instead of failing with "Coverage data for
 * ... was not found" for every project that did not run.
 */
const coverageFloorByProject: Record<
	string,
	keyof typeof perPathCoverageThresholds
> = {
	"packages/auth": "./packages/auth/",
	"packages/features": "./packages/features/",
	"packages/internal": "./packages/internal/",
	"packages/midtrans": "./packages/midtrans/",
	"packages/react": "./packages/react/",
	"apps/api": "./apps/api/",
	"apps/dashboard": "./apps/dashboard/",
	"apps/api-internal": "./apps/api-internal/",
	"apps/web": "./apps/web/",
};

/**
 * Reads the projects a run was told to select, or `null` for a whole-tree run.
 *
 * Jest applies a `coverageThreshold` path group to the coverage report of
 * the run. When only some projects run, the other groups match no file and
 * Jest reports "Coverage data for ... was not found" — a confusing failure
 * for a targeted run that is otherwise perfectly valid. The floors describe
 * the whole tree, so on a targeted run only the floors of the projects that
 * actually ran apply.
 *
 * @param argv - The process arguments jest was invoked with.
 * @returns The selected project names, or `null` when the run is not scoped.
 */
const readSelectedProjects = (argv: string[]): string[] | null => {
	const index = argv.findIndex(
		(argument) =>
			argument === "--selectProjects" ||
			argument.startsWith("--selectProjects=")
	);

	if (index === -1) {
		return null;
	}

	const inline = argv[index].split("=")[1];
	if (inline) {
		return inline.split(",").filter(Boolean);
	}

	return (argv[index + 1] ?? "").split(",").filter(Boolean);
};

const selectedProjects = readSelectedProjects(process.argv);

/**
 * The floors that apply to this run.
 *
 * A whole-tree run — which is what CI and the pre-push hook execute — gets
 * every floor. A targeted run gets the floors of the projects it selected,
 * so iterating on one package stays fast and still meaningful.
 */
const coverageThresholds = (() => {
	if (selectedProjects === null) {
		return {
			global: {
				branches: 80,
				functions: 80,
				lines: 80,
				statements: 80,
			},
			...perPathCoverageThresholds,
		};
	}

	// The global floor describes the files no path group claims — which in a
	// targeted run is nothing, because every file in the report belongs to a
	// project that was selected. Zero is therefore the honest value here.
	const applicable: {
		global: {
			branches: number;
			functions: number;
			lines: number;
			statements: number;
		};
	} & Record<
		string,
		{
			branches: number;
			functions: number;
			lines: number;
			statements: number;
		}
	> = {
		global: { branches: 0, functions: 0, lines: 0, statements: 0 },
	};

	for (const project of selectedProjects) {
		const floor = coverageFloorByProject[project];

		if (floor) {
			applicable[floor] = perPathCoverageThresholds[floor];
		}
	}

	return applicable;
})();

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
			// `apps/api-internal` is mounted here so its source files reach the
			// haste map: the coverage reporter can only add untested files that
			// live inside a project's roots.
			roots: ["<rootDir>/apps/api/", "<rootDir>/apps/api-internal/"],
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
			// `apps/web` is mounted here so its source files reach the haste
			// map: the coverage reporter can only add untested files that live
			// inside a project's roots.
			roots: ["<rootDir>/apps/dashboard/", "<rootDir>/apps/web/"],
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
	collectCoverageFrom,
	/**
	 * Per-package floors.
	 *
	 * Every number below was measured with `collectCoverageFrom` in place,
	 * i.e. against the real denominator (the whole source tree), not the
	 * flattering "only files a test happened to load" set. Each floor is set
	 * at or just below the measured value, so the gate is green today and
	 * turns red the moment a package regresses.
	 *
	 * `global` covers the files that are not claimed by a path group
	 * (packages/core and packages/shared). The per-path groups are the real
	 * signal: a single global number cannot describe a tree where one app is
	 * at 100% and another has no tests at all.
	 */
	coverageThreshold: coverageThresholds,
};

export default config;
