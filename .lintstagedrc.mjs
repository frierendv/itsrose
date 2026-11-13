// @ts-check
import { defineConfig } from "lint-staged/config";

export default defineConfig({
	"*.{md,html,css,json,yml,yaml}": ["prettier --write"],
	"*.{js,ts,tsx,jsx}": ["eslint --fix", "prettier --write"],
	"*.sh": [
		"shfmt --language-dialect auto",
		"shellcheck --check-sourced --severity=error",
	],
	Dockerfile: ["dockerfmt --newline"],
});
