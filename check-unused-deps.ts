/**
 * Reports dependencies that a workspace declares but never uses.
 *
 * The tsdown `unused` check (`packages/standard/tsdown/tsdown.config.mjs`)
 * covers `dependencies` and `peerDependencies` of the packages that build
 * with the shared preset. It cannot see three things:
 *
 *   1. `devDependencies` — the check only inspects the two kinds above.
 *   2. `packages/types` — it has its own tsdown config and no shared preset.
 *   3. The workspaces that never build with tsdown at all — `packages/standard`,
 *      `apps/dashboard`, `apps/web` and `apps/waf-page`.
 *
 * This script covers the whole workspace. It answers one question per
 * dependency: can the workspace reach it?
 *
 * A dependency is reachable when any of the following holds:
 *
 *   - a source file imports it, by name or by subpath;
 *   - a stylesheet `@import`s it;
 *   - a config file names it, the way `next.config.ts` names a turbopack
 *     loader or a remark plugin;
 *   - a `tsconfig.json` `types` array names it;
 *   - a `package.json` script invokes its binary;
 *   - it is a required peer of a dependency that is itself reachable.
 *
 * The last rule is what keeps a dependency alive when it is only needed to
 * satisfy another package: `react-dom` is required by `next`, so a Next.js
 * workspace that imports `next` needs `react-dom` even if it never imports
 * `react-dom` itself.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/** Directories that never contain a workspace's own source. */
const IGNORED_DIRS = new Set([
	".astro",
	".git",
	".next",
	".sonda",
	".turbo",
	"coverage",
	"dist",
	"node_modules",
	"out",
]);

/** The dependency kinds this script audits. */
const DEP_KINDS = [
	"dependencies",
	"devDependencies",
	"peerDependencies",
	"optionalDependencies",
] as const;

/** Files whose contents can prove a dependency is used. */
const SOURCE_EXTENSIONS = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|astro|mdx)$/;

/** Files that can name a dependency without importing it. */
const CONFIG_EXTENSIONS = /\.(json|css|scss|md|yml|yaml)$/;

/**
 * Package scripts invoke a dependency's binary by name, not by package name.
 * The key is the package; the value is the binary that package installs.
 */
const TOOLCHAIN_BINARIES: Record<string, string> = {
	eslint: "eslint",
	prettier: "prettier",
	rimraf: "rimraf",
	syncpack: "syncpack",
	typescript: "tsc",
	tsdown: "tsdown",
	tsx: "tsx",
	turbo: "turbo",
	vitest: "vitest",
};

interface Workspace {
	/** Path relative to the repository root. */
	dir: string;
	pkg: Record<string, unknown>;
}

/**
 * Config files name their plugins as bare strings. They are TypeScript, so
 * they are matched by name rather than by extension.
 */
const CONFIG_FILE_NAMES = [
	"next.config.ts",
	"next.config.mjs",
	"next.config.js",
	"astro.config.mjs",
	"astro.config.ts",
	"eslint.config.ts",
	"eslint.config.js",
	"vitest.config.mts",
	"vitest.config.ts",
	"tsdown.config.ts",
	"tailwind.config.ts",
	"postcss.config.mjs",
];

/** Whether a file is one of the configuration files listed above. */
function isConfigFile(file: string): boolean {
	const name = path.basename(file);
	return CONFIG_FILE_NAMES.includes(name);
}

function findWorkspaces(): Workspace[] {
	const workspaces: Workspace[] = [];

	const consider = (dir: string) => {
		const pkgPath = path.join(dir, "package.json");
		if (!fs.existsSync(pkgPath)) {
			return;
		}
		workspaces.push({
			dir: path.relative(ROOT, dir),
			pkg: JSON.parse(fs.readFileSync(pkgPath, "utf8")),
		});
	};

	for (const group of ["packages", "apps"]) {
		const groupDir = path.join(ROOT, group);
		if (!fs.existsSync(groupDir)) {
			continue;
		}
		for (const entry of fs.readdirSync(groupDir, { withFileTypes: true })) {
			if (!entry.isDirectory()) {
				continue;
			}
			const direct = path.join(groupDir, entry.name);
			consider(direct);
			if (!fs.existsSync(path.join(direct, "package.json"))) {
				for (const nested of fs.readdirSync(direct, {
					withFileTypes: true,
				})) {
					if (nested.isDirectory()) {
						consider(path.join(direct, nested.name));
					}
				}
			}
		}
	}

	return workspaces.sort((a, b) => a.dir.localeCompare(b.dir));
}

function collectFiles(dir: string): string[] {
	const files: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (IGNORED_DIRS.has(entry.name)) {
			continue;
		}
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectFiles(full));
			continue;
		}
		if (
			SOURCE_EXTENSIONS.test(entry.name) ||
			CONFIG_EXTENSIONS.test(entry.name) ||
			entry.name === "package.json"
		) {
			files.push(full);
		}
	}
	return files;
}

/**
 * Extracts every module specifier a file imports.
 *
 * The patterns cover the forms that actually appear in this repository:
 * static imports, re-exports, CommonJS requires, dynamic imports and
 * `import type`.
 */
function extractSpecifiers(code: string): string[] {
	const specifiers: string[] = [];
	const patterns = [
		/\bfrom\s*["']([^"']+)["']/g,
		/\bimport\s*["']([^"']+)["']/g,
		/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
		/@import\s+["']([^"']+)["']/g,
	];
	for (const pattern of patterns) {
		for (const match of code.matchAll(pattern)) {
			specifiers.push(match[1]);
		}
	}
	return specifiers;
}

/**
 * Extracts the bare package names a config file names as a string value.
 *
 * `next.config.ts` names a turbopack loader and its remark plugins this way,
 * and no import statement proves those are reachable.
 */
function extractQuotedNames(code: string): string[] {
	const names: string[] = [];
	for (const match of code.matchAll(/"([^"\\\n]+)"|'([^'\\\n]+)'/g)) {
		names.push(match[1] ?? match[2]);
	}
	return names;
}

/**
 * Reads the `types` arrays of every tsconfig in a workspace, following the
 * `extends` chain.
 *
 * A workspace that inherits `@itsrose/standard/typescript/node.json` gets
 * `vitest/globals` from it, so the chain has to be followed to see the types
 * that are actually in scope.
 */
function collectTsconfigTypes(dir: string): string[] {
	const types: string[] = [];
	for (const file of collectFiles(dir)) {
		if (!file.endsWith("tsconfig.json")) {
			continue;
		}
		types.push(...tsconfigTypesOf(file, new Set()));
	}
	return types;
}

/** Reads one tsconfig's `types`, plus those of the configs it extends. */
function tsconfigTypesOf(file: string, seen: Set<string>): string[] {
	if (seen.has(file)) {
		return [];
	}
	seen.add(file);

	let json: Record<string, unknown>;
	try {
		json = JSON.parse(fs.readFileSync(file, "utf8"));
	} catch {
		// A tsconfig with comments is not JSON; its types are inherited.
		return [];
	}

	const types: string[] = [];
	const declared = (json.compilerOptions as { types?: unknown })?.types;
	if (Array.isArray(declared)) {
		types.push(...(declared as string[]));
	}

	const extendsField = json.extends;
	if (typeof extendsField === "string") {
		for (const parent of resolveExtends(extendsField, path.dirname(file))) {
			types.push(...tsconfigTypesOf(parent, seen));
		}
	}

	return types;
}

/** Resolves an `extends` value — a relative path or a package specifier. */
function resolveExtends(specifier: string, fromDir: string): string[] {
	const candidates: string[] = [];

	if (specifier.startsWith(".") || specifier.startsWith("/")) {
		candidates.push(path.resolve(fromDir, specifier));
	} else {
		// A package specifier: `@scope/name/path` or `name/path`.
		const parts = specifier.split("/");
		const packageName = specifier.startsWith("@")
			? parts.slice(0, 2).join("/")
			: parts[0];
		const subPath = specifier.slice(packageName.length + 1);
		const manifest = path.join(
			ROOT,
			"node_modules",
			packageName,
			subPath ? `${subPath}` : ""
		);
		candidates.push(manifest);
	}

	const resolved: string[] = [];
	for (const candidate of candidates) {
		if (!candidate.endsWith(".json")) {
			continue;
		}
		if (fs.existsSync(candidate)) {
			resolved.push(candidate);
		}
	}
	return resolved;
}

/**
 * Reads the peer dependencies a package requires.
 *
 * Both required and optional peers count. pnpm does not install optional
 * peers, so a workspace that wants the optional feature must declare the peer
 * itself — declaring it is exactly how the consumer opts in.
 */
function requiredPeers(workspace: Workspace, dependency: string): string[] {
	const manifest = path.join(
		workspace.dir,
		"node_modules",
		dependency,
		"package.json"
	);
	if (!fs.existsSync(manifest)) {
		return [];
	}
	try {
		const pkg = JSON.parse(fs.readFileSync(manifest, "utf8"));
		return Object.keys(pkg.peerDependencies ?? {});
	} catch {
		return [];
	}
}

interface Unused {
	workspace: string;
	dependency: string;
	kind: string;
}

function audit(workspace: Workspace): Unused[] {
	const files = collectFiles(path.join(ROOT, workspace.dir));
	const pkgPath = path.join(ROOT, workspace.dir, "package.json");

	const specifiers = new Set<string>();
	const quotedNames = new Set<string>();
	for (const file of files) {
		// The workspace's own manifest names every dependency it declares, so
		// reading it would prove every dependency reachable.
		if (file === pkgPath) {
			continue;
		}
		const code = fs.readFileSync(file, "utf8");
		for (const specifier of extractSpecifiers(code)) {
			specifiers.add(specifier);
		}
		// A config file names a plugin or loader as a bare string, with no
		// import statement to prove it is reachable: `next.config.ts` names
		// `remark-gfm` and `@tailwindcss/turbopack` that way.
		if (CONFIG_EXTENSIONS.test(file) || isConfigFile(file)) {
			for (const name of extractQuotedNames(code)) {
				quotedNames.add(name);
			}
		}
	}

	// A dependency is reachable when a file imports it by name or by subpath.
	const isImported = (name: string) =>
		[...specifiers].some(
			(specifier) =>
				specifier === name || specifier.startsWith(`${name}/`)
		);

	// A dependency is reachable when a config file names it as a string value.
	const isNamedInConfig = (name: string) => quotedNames.has(name);

	// A dependency is reachable when a tsconfig names it in `types`.
	const tsconfigTypes = collectTsconfigTypes(path.join(ROOT, workspace.dir));
	const isTsconfigType = (name: string) =>
		tsconfigTypes.some(
			(type) => type === name || type.startsWith(`${name}/`)
		);

	/**
	 * A tsconfig with no `types` array includes every `@types/*` package it can
	 * find, so those are reachable whether or not a file names them.
	 */
	const hasTypesArray = tsconfigTypes.length > 0;

	// A dependency is reachable when a script invokes its binary.
	const scripts = Object.values(workspace.pkg.scripts ?? {}).join(" ");
	const isToolchain = (name: string) => {
		const binary = TOOLCHAIN_BINARIES[name];
		if (!binary) {
			return false;
		}
		return new RegExp(`(^|[\\s"'&|])${binary}([\\s"']|$)`).test(scripts);
	};

	// A `@types/*` package types the library of the same name. It is reachable
	// when that library is imported, or when a tsconfig names it in `types`.
	const typePackageTarget = (name: string): string | null =>
		name.startsWith("@types/") ? name.slice("@types/".length) : null;

	/**
	 * The dependencies this workspace can reach, resolved transitively.
	 *
	 * The seed is the set of dependencies the workspace actually uses. A
	 * dependency that is only declared is not a seed — otherwise every
	 * declaration would be trivially reachable and the audit would find
	 * nothing.
	 */
	const used = new Set<string>();
	for (const kind of DEP_KINDS) {
		const declared = (workspace.pkg[kind] ?? {}) as Record<string, string>;
		for (const name of Object.keys(declared)) {
			if (
				isImported(name) ||
				isNamedInConfig(name) ||
				isTsconfigType(name)
			) {
				used.add(name);
			}
		}
	}

	const reachable = new Set<string>();
	const queue = [...used];
	while (queue.length > 0) {
		const name = queue.shift();
		if (!name || reachable.has(name)) {
			continue;
		}
		reachable.add(name);
		for (const peer of requiredPeers(workspace, name)) {
			queue.push(peer);
		}
	}

	const unused: Unused[] = [];
	for (const kind of DEP_KINDS) {
		const declared = (workspace.pkg[kind] ?? {}) as Record<string, string>;
		for (const name of Object.keys(declared)) {
			if (isImported(name)) {
				continue;
			}
			if (isNamedInConfig(name)) {
				continue;
			}
			if (isTsconfigType(name)) {
				continue;
			}
			if (isToolchain(name)) {
				continue;
			}

			const target = typePackageTarget(name);
			if (target && (isImported(target) || isTsconfigType(target))) {
				continue;
			}

			// A `@types/*` package in a workspace whose tsconfig has no `types`
			// array is included automatically, so it is reachable.
			if (target && !hasTypesArray) {
				continue;
			}

			// Reachable as a required peer of a reachable dependency.
			if (reachable.has(name)) {
				continue;
			}

			unused.push({ workspace: workspace.dir, dependency: name, kind });
		}
	}
	return unused;
}

const unused = findWorkspaces().flatMap(audit);

for (const finding of unused) {
	console.log(`${finding.workspace}\t${finding.kind}\t${finding.dependency}`);
}

if (unused.length > 0) {
	console.error(
		`\n${unused.length} unused dependenc${unused.length === 1 ? "y" : "ies"} found.`
	);
	process.exit(1);
}

console.log("No unused dependencies found.");
