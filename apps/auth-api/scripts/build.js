import fs from "node:fs";
import path from "node:path";
import { nodeFileTrace } from "@vercel/nft";

const baseDir = path.resolve(import.meta.dirname, "../");
const outDir = path.resolve(baseDir, "out");
const distDir = path.resolve(baseDir, "dist");

const files = [path.join(distDir, "main.mjs"), path.join(distDir, "app.mjs")];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const { fileList } = await nodeFileTrace(files, {
	conditions: ["node", "production"],
});

for (const file of fileList) {
	const src = path.resolve(file);
	const dest = path.join(outDir, file);
	// `@vercel/nft` may return directory entries (e.g. a package root).
	// `copyFileSync` fails on directories (EPERM on Windows), so handle both.
	const stat = fs.statSync(src, { throwIfNoEntry: false });
	if (!stat) {
		continue;
	}

	const destStat = fs.lstatSync(dest, { throwIfNoEntry: false });

	if (stat.isDirectory()) {
		fs.mkdirSync(dest, { recursive: true });
		continue;
	}

	if (destStat?.isDirectory()) {
		continue;
	}

	if (destStat) {
		fs.rmSync(dest, { force: true });
	}

	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
}
