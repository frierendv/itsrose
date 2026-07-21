import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nodeFileTrace } from "@vercel/nft";

// eslint-disable-next-line @typescript-eslint/naming-convention
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line @typescript-eslint/naming-convention
const __dirname = path.dirname(__filename);

const outDir = path.resolve(__dirname, "out");
const cache = Object.create(null);

const files = [
	path.resolve(__dirname, "dist/main.mjs"),
	path.resolve(__dirname, "dist/app.mjs"),
];
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

(async () => {
	const { fileList } = await nodeFileTrace(files, {
		base: path.resolve(__dirname, "../.."),
		conditions: ["node", "production"],
		cache,
	});

	for (const file of fileList) {
		const src = path.resolve(file);
		const dest = path.join(outDir, file);

		// `@vercel/nft` may return directory entries (e.g. a package root).
		// `copyFileSync` fails on directories (EPERM on Windows), so handle both.
		let stat;
		try {
			stat = fs.statSync(src);
		} catch {
			continue;
		}

		let destStat;
		try {
			destStat = fs.lstatSync(dest);
		} catch {
			destStat = null;
		}

		if (stat.isDirectory()) {
			fs.mkdirSync(dest, { recursive: true });
			if (typeof fs.cpSync === "function") {
				fs.cpSync(src, dest, {
					recursive: true,
					force: true,
					dereference: true,
				});
			} else {
				const copyDir = (from, to) => {
					fs.mkdirSync(to, { recursive: true });
					for (const entry of fs.readdirSync(from, {
						withFileTypes: true,
					})) {
						const fromPath = path.join(from, entry.name);
						const toPath = path.join(to, entry.name);
						if (entry.isDirectory()) {
							copyDir(fromPath, toPath);
						} else {
							fs.copyFileSync(fromPath, toPath);
						}
					}
				};
				copyDir(src, dest);
			}
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
})();
