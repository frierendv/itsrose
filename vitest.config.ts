import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves a path inside the repository to an absolute one.
 *
 * @param segments - Path segments relative to the repository root.
 * @returns The absolute path.
 */
const repo = (...segments: string[]): string => path.join(rootDir, ...segments);

/**
 * The test files of one package group.
 *
 * @param group - A path relative to the repository root.
 * @returns A glob that matches every test file in the group.
 */
const testsIn = (group: string): string[] => [
	`${group}/**/__tests__/**/*.test.{ts,tsx}`,
];

/**
 * Aliases every `@itsrose/*` package to its source directory.
 *
 * The subpath exports that do not live at `src/<subpath>` need their own
 * entry and are listed first, because the alias plugin takes the first
 * match — `@itsrose/react` would otherwise swallow `@itsrose/react/navbar`.
 */
const workspaceAliases = [
	{
		find: "@itsrose/auth-billing/plugin",
		replacement: repo("packages/auth/billing/src/plugin/plugin-server.ts"),
	},
	{
		find: "@itsrose/auth-billing/plugin-server",
		replacement: repo("packages/auth/billing/src/plugin/plugin-server.ts"),
	},
	{
		find: "@itsrose/auth-billing/plugin-client",
		replacement: repo("packages/auth/billing/src/plugin/plugin-client.ts"),
	},
	{
		find: "@itsrose/auth-usage/plugin",
		replacement: repo("packages/auth/usage/src/plugin/plugin-server.ts"),
	},
	{
		find: "@itsrose/auth-usage/plugin-server",
		replacement: repo("packages/auth/usage/src/plugin/plugin-server.ts"),
	},
	{
		find: "@itsrose/auth-usage/plugin-client",
		replacement: repo("packages/auth/usage/src/plugin/plugin-client.ts"),
	},
	{
		find: "@itsrose/auth-mailer/plugin",
		replacement: repo("packages/auth/mailer/src/plugin-server.ts"),
	},
	{
		find: "@itsrose/auth-storage/plugin",
		replacement: repo("packages/auth/storage/src/plugin-server.ts"),
	},
	{
		find: "@itsrose/react/itsrose",
		replacement: repo("packages/react/src/components/itsrose"),
	},
	{
		find: "@itsrose/react/navbar",
		replacement: repo("packages/react/src/components/navbar"),
	},
	{
		find: "@itsrose/react/sidebar",
		replacement: repo("packages/react/src/components/sidebar"),
	},
	{
		find: "@itsrose/react/styles",
		replacement: repo("packages/react/src/styles/index.css"),
	},

	{
		find: "@itsrose/api-response",
		replacement: repo("packages/internal/api-response/src"),
	},
	{
		find: "@itsrose/http-client",
		replacement: repo("packages/internal/http-client/src"),
	},
	{
		find: "@itsrose/http-code",
		replacement: repo("packages/internal/http-code/src"),
	},
	{ find: "@itsrose/s3", replacement: repo("packages/internal/s3/src") },
	{
		find: "@itsrose/upstream-client",
		replacement: repo("packages/internal/upstream-client/src"),
	},

	{
		find: "@itsrose/character-ai",
		replacement: repo("packages/features/character-ai/src"),
	},
	{
		find: "@itsrose/elevenlabs",
		replacement: repo("packages/features/elevenlabs/src"),
	},
	{
		find: "@itsrose/instagram",
		replacement: repo("packages/features/instagram/src"),
	},
	{ find: "@itsrose/mtxx", replacement: repo("packages/features/mtxx/src") },
	{
		find: "@itsrose/remini",
		replacement: repo("packages/features/remini/src"),
	},
	{
		find: "@itsrose/tiktok",
		replacement: repo("packages/features/tiktok/src"),
	},

	{
		find: "@itsrose/api-routes",
		replacement: repo("packages/api-routes/src"),
	},
	{
		find: "@itsrose/auth-billing",
		replacement: repo("packages/auth/billing/src"),
	},
	{
		find: "@itsrose/auth-mailer",
		replacement: repo("packages/auth/mailer/src"),
	},
	{
		find: "@itsrose/auth-storage",
		replacement: repo("packages/auth/storage/src"),
	},
	{
		find: "@itsrose/auth-usage",
		replacement: repo("packages/auth/usage/src"),
	},
	{ find: "@itsrose/auth", replacement: repo("packages/auth/core/src") },
	{ find: "@itsrose/midtrans", replacement: repo("packages/midtrans/src") },
	{ find: "@itsrose/react", replacement: repo("packages/react/src") },
	{
		find: "@itsrose/shared-schema",
		replacement: repo("packages/shared/shared-schema/src"),
	},
	{ find: "@itsrose/system", replacement: repo("packages/core/system/src") },
	{ find: "@itsrose/types", replacement: repo("packages/types/src") },
	{
		find: "better-auth/api",
		replacement: repo("packages/auth/core/__mocks__/better-auth-api.ts"),
	},
];

/**
 * The aliases the shared route surface needs.
 *
 * The route tests assert what the route does, not what the upstream
 * answered, so the feature clients are replaced by stubs. The stubs come
 * first: the alias plugin takes the first match, and the workspace aliases
 * would otherwise resolve the real clients.
 *
 * The stub aliases match the package root exactly. A string alias also
 * matches every subpath of the package, which would send `@itsrose/<pkg>/env`
 * — the environment variable names each package publishes — into the stub
 * file. The subpaths are not clients, so they keep resolving to the real
 * source through the workspace aliases.
 */
const apiRoutesAliases = [
	{
		find: /^@itsrose\/character-ai$/,
		replacement: repo(
			"packages/api-routes/__tests__/mocks/character-ai.ts"
		),
	},
	{
		find: /^@itsrose\/elevenlabs$/,
		replacement: repo("packages/api-routes/__tests__/mocks/elevenlabs.ts"),
	},
	{
		find: /^@itsrose\/instagram$/,
		replacement: repo("packages/api-routes/__tests__/mocks/instagram.ts"),
	},
	{
		find: /^@itsrose\/mtxx$/,
		replacement: repo("packages/api-routes/__tests__/mocks/mtxx.ts"),
	},
	{
		find: /^@itsrose\/remini$/,
		replacement: repo("packages/api-routes/__tests__/mocks/remini.ts"),
	},
	{
		find: /^@itsrose\/tiktok$/,
		replacement: repo("packages/api-routes/__tests__/mocks/tiktok.ts"),
	},
	{
		find: "@remix-run/multipart-parser/node",
		replacement: repo(
			"packages/api-routes/__tests__/mocks/multipart-parser.ts"
		),
	},
	...workspaceAliases,
];

export default defineConfig({
	resolve: {
		alias: workspaceAliases,
		tsconfigPaths: true,
	},
	test: {
		globals: true,
		environment: "node",
		/**
		 * The `vmThreads` pool creates the environment once per worker
		 * instead of once per file, and keeps the per-file isolation the
		 * `forks` pool gives. Under the two-worker cap the test script
		 * sets, that is the difference between 10 seconds and 25.
		 */
		pool: "vmThreads",
		/**
		 * Jest does not clear mock history between tests. Vitest 5 does.
		 * The suite keeps the Jest behaviour, because a handful of tests
		 * assert on calls recorded outside the test body.
		 */
		clearMocks: false,
		/**
		 * Jest runs the "after" hooks in the order they were declared.
		 * Vitest runs them in reverse by default. Several suites tear down
		 * a server and restore the environment in those hooks.
		 */
		sequence: {
			hooks: "list",
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json"],
			include: [
				"packages/*/src/**/*.{ts,tsx,js,jsx}",
				"packages/*/*/src/**/*.{ts,tsx,js,jsx}",
				"packages/*/tools/**/*.{ts,tsx,js,jsx}",
				"apps/*/src/**/*.{ts,tsx,js,jsx}",
				"apps/*/{app,components,config,constants,features,hooks,layouts,lib,providers,server,shared,types}/**/*.{ts,tsx,js,jsx}",
				"apps/*/proxy.{ts,tsx,js,jsx}",
				"apps/*/mdx-components.{ts,tsx,js,jsx}",
			],
			exclude: [
				"packages/types/**",
				"packages/standard/**",
				"**/__tests__/**",
				"**/__mocks__/**",
				"**/next.config.{ts,tsx,js,jsx}",
				"**/eslint.config.{ts,tsx,js,jsx}",
				"**/tsdown.config.{ts,tsx,js,jsx}",
				"**/*.d.ts",
			],
			// The thresholds are missing on purpose — see the file header.
		},
		projects: [
			{
				test: {
					name: "packages/core",
					include: testsIn("packages/core"),
				},
			},
			{
				test: {
					name: "packages/features",
					include: testsIn("packages/features"),
				},
			},
			{
				test: {
					name: "packages/internal",
					include: testsIn("packages/internal"),
				},
			},
			{
				test: {
					name: "packages/shared",
					include: testsIn("packages/shared"),
				},
			},
			{
				test: {
					name: "packages/midtrans",
					include: testsIn("packages/midtrans"),
				},
			},
			{
				test: {
					name: "packages/auth",
					include: testsIn("packages/auth"),
				},
			},
			{
				// The stubs have to come before the workspace aliases, and
				// inherited aliases are merged ahead of the project's own.
				// Opting out of inheritance is what keeps the order right.
				extends: false,
				resolve: {
					alias: apiRoutesAliases,
					tsconfigPaths: true,
				},
				test: {
					name: "packages/api-routes",
					include: testsIn("packages/api-routes"),
					setupFiles: [
						repo("packages/api-routes/__tests__/setup-env.ts"),
					],
					// Opting out of inheritance means the root settings have
					// to be repeated here.
					globals: true,
					clearMocks: false,
					sequence: { hooks: "list" },
				},
			},
			{
				test: {
					name: "packages/react",
					environment: "jsdom",
					include: testsIn("packages/react"),
					setupFiles: ["@testing-library/jest-dom/vitest"],
				},
			},
			{
				resolve: {
					alias: [
						{
							find: /^@\//,
							replacement: `${repo("apps/api/src")}/`,
						},
						...workspaceAliases,
					],
					tsconfigPaths: true,
				},
				test: {
					name: "apps/api",
					include: testsIn("apps/api"),
				},
			},
			{
				resolve: {
					alias: [
						{
							find: "@better-auth-ui/core",
							replacement: repo(
								"apps/dashboard/__mocks__/better-auth-ui-core.ts"
							),
						},
						{
							find: /^@\//,
							replacement: `${repo("apps/dashboard")}/`,
						},
						...workspaceAliases,
					],
					tsconfigPaths: true,
				},
				test: {
					name: "apps/dashboard",
					environment: "jsdom",
					include: testsIn("apps/dashboard"),
				},
			},
		],
	},
});
