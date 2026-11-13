import type { RcFile } from "syncpack";

const config: RcFile = {
	indent: "\t",
	formatBugs: true,
	formatRepository: false,
	maxConcurrentRequests: 2,
	sourceMode: "extend",
	source: ["./packages/*/package.json"],
	versionGroups: [
		{
			label: "itsrose-workspace",
			dependencies: ["@itsrose/*"],
			pinVersion: "workspace:*",
		},
		{
			label: "PNPM Catalog",
			// Catalog definitions are excluded from this group, otherwise
			// `syncpack update` treats them as pinned and never bumps
			// pnpm-workspace.yaml's `catalog:` entries. The group still
			// enforces `catalog:` usage in package.json files.
			dependencyTypes: ["!pnpmCatalog"],
			dependencies: [
				"@types/node",
				"@types/react",
				"@types/react-dom",

				"better-auth",
				"typescript",
				"zod",
				// React/nextjs
				"@types/react",
				"@types/react-dom",
				"next",
			],
			policy: "catalog",
		},
	],
	updateGroups: [
		{
			label: "TypeScript stays on the current major",
			// TypeScript 7 (Go-based) is not a drop-in upgrade: the compiler,
			// plugin and programmatic APIs changed. Only let `update` move
			// within the current major until the migration is done
			// deliberately (bump the catalog entry by hand).
			dependencies: ["typescript"],
			target: "minor",
		},
	],
	sortFirst: [
		"name",
		"version",
		"author",
		"private",
		"type",
		"sideEffects",
		"license",
		"description",
		"repository",
		"bugs",
		"homepage",
		"main",
		"module",
		"types",
		"typings",
		"files",
		"keywords",
		"exports",
		"engines",
		"scripts",
		"peerDependencies",
		"peerDependenciesMeta",
		"dependencies",
		"devDependencies",
		"optionalDependencies",
		"resolutions",
	],
};

export default config;
