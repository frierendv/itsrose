import fs from "node:fs";
import path from "node:path";
import { format, resolveConfig } from "prettier";

export interface ProjectReference {
	path: string;
}

export interface TsConfig {
	files?: string[];
	include?: string[];
	exclude?: string[];
	references?: ProjectReference[];
	[key: string]: unknown;
}

const ROOT_DIR = process.cwd();
const ROOT_TSCONFIG = path.join(ROOT_DIR, "tsconfig.json");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");

const IGNORED_DIRS = new Set([
	"node_modules",
	"dist",
	"build",
	"coverage",
	".turbo",
	".git",
	".next",
]);

/**
 * Recursively discovers all subdirectories under `dir` containing a `tsconfig.json` file.
 */
export function findTsconfigPackages(
	dir: string,
	fileList: ProjectReference[] = []
): ProjectReference[] {
	if (!fs.existsSync(dir)) {
		return fileList;
	}

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (
			!entry.isDirectory() ||
			entry.name.startsWith(".") ||
			IGNORED_DIRS.has(entry.name)
		) {
			continue;
		}

		const fullPath = path.join(dir, entry.name);
		const tsconfigPath = path.join(fullPath, "tsconfig.json");

		if (fs.existsSync(tsconfigPath)) {
			// Get relative path from monorepo root (POSIX forward slashes)
			const relativePath = path
				.relative(ROOT_DIR, fullPath)
				.replaceAll("\\", "/");
			fileList.push({ path: relativePath });
		} else {
			findTsconfigPackages(fullPath, fileList);
		}
	}

	return fileList;
}

/**
 * Synchronizes discovered package references into the root `tsconfig.json`.
 */
export async function syncPackageReferences(): Promise<void> {
	console.log("Scanning for nested packages...");

	if (!fs.existsSync(ROOT_TSCONFIG)) {
		throw new Error(`Root tsconfig.json not found at: ${ROOT_TSCONFIG}`);
	}

	const references = findTsconfigPackages(PACKAGES_DIR);

	// Sort alphabetically so git diffs stay clean
	references.sort((a, b) => a.path.localeCompare(b.path));

	// Read and parse current root tsconfig
	const currentContent = fs.readFileSync(ROOT_TSCONFIG, "utf8");
	const currentConfig = JSON.parse(currentContent) as TsConfig;

	currentConfig.references = references;

	const prettierConfig = await resolveConfig("./prettierrc");
	const updatedContent = await format(
		JSON.stringify(currentConfig, null, "\t"),
		{ ...prettierConfig, parser: "json" }
	);
	fs.writeFileSync(ROOT_TSCONFIG, updatedContent, "utf8");

	console.log(
		`✅ Successfully synced ${references.length} project references to root tsconfig.json!`
	);
}

try {
	syncPackageReferences();
} catch (error) {
	console.error(
		"❌ Error syncing project references:",
		error instanceof Error ? error.message : error
	);
	process.exit(1);
}
