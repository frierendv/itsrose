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
			dependencies: [
				"@types/node",
				"typescript",
				"chalk",
				"zod",
				// React/nextjs
				"@types/react",
				"@types/react-dom",
				"next",
			],
			policy: "catalog",
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
