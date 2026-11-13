/**
 * ESLint configuration for the repository root.
 *
 * Packages and apps each carry their own flat config, which ESLint resolves
 * per file. This config covers the repository's own tooling files, which
 * otherwise have no lint coverage at all — and which the lint-staged
 * pre-commit hook cannot lint, because ESLint needs a config to start from.
 */
export { config as default } from "@itsrose/standard/eslint/base";
