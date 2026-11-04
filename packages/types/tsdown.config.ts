import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	clean: true,
	dts: { enabled: true },
	format: ["esm"],
	target: ["es2024"],
	treeshake: true,
	outExtensions: ({ format }) => {
		if (format === "es") {
			return { js: ".mjs", dts: ".d.ts" };
		}
		return {};
	},
});
