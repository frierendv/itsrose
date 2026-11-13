// @ts-check
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ActionType, NodePlopAPI } from "plop";

const execAsync = promisify(exec);

export interface ModuleAnswers {
	category: "others" | "core" | "features" | "internal" | "shared" | "root";
	name: string;
	author: string;
	description?: string;
	longDescription?: string;
}

const scope = "@itsrose";
const workspaceDevDependencies = [
	"standard", // @itsrose/standard
].map((dep) => `${scope}/${dep}` as const);

/**
 * Builds a minimal Jest/Vitest smoke test for a freshly scaffolded module.
 * Importing the package entry point keeps the file from being flagged as an
 * unused or empty test suite while the module is still a stub.
 */
function buildModuleTest(category: string, name: string): string {
	return `describe("${category}/${name}", () => {
\tit("is importable", async () => {
\t\tconst module = await import("../src/index");
\t\texpect(module).toBeDefined();
\t});
});
`;
}

export default function (plop: NodePlopAPI) {
	plop.setActionType("runCommand", async (_answers, config) => {
		const command = config.command;
		if (!command) {
			throw new Error(
				"Missing 'command' property in runCommand action config."
			);
		}
		const { stdout } = await execAsync(command);
		return stdout ? stdout.trim() : "Success";
	});

	plop.setGenerator("module", {
		description: "create new packages/module",

		prompts: async (inquirer) => {
			return inquirer.prompt<ModuleAnswers>([
				{
					type: "list",
					name: "category",
					message: "Select module category:",
					choices: [
						{ name: "Root", value: "root" },
						{ name: "Core", value: "core" },
						{ name: "Features", value: "features" },
						{ name: "Internal", value: "internal" },
						{ name: "Shared", value: "shared" },
						{ name: "Others", value: "others" },
					],
					default: "others",
				},
				{
					type: "input",
					name: "name",
					message: `Package name ${scope}/name\n->`,
					validate: (input: string) => {
						const name = input.trim();
						if (!name) {
							return "Package name is required.";
						}
						if (!/^[a-z0-9-]+$/.test(name)) {
							return "Package name must contain only lowercase letters, numbers, and hyphens.";
						}
						return true;
					},
				},
				{
					type: "input",
					name: "author",
					message: "Author name for this module\n->",
					default: "FrierenDv",
				},
				{
					type: "input",
					name: "description",
					message:
						"Short description about this module (optional)\n->",
				},
				{
					type: "input",
					name: "longDescription",
					message:
						"Long description about this module (optional)\n->",
					when: (answers) => answers.description,
				},
			]);
		},

		actions: (data) => {
			const answers = data as ModuleAnswers;

			const directory =
				answers.category === "root"
					? `packages/${answers.name}`
					: `packages/${answers.category}/${answers.name}`;
			const packageName = `${scope}/${answers.name}`;

			const actions: ActionType[] = [
				{
					type: "addMany",
					destination: directory,
					base: "plop-templates/module",
					templateFiles: "plop-templates/module/**/*",
					data: { directory },
					globOptions: { dot: true },
					skipIfExists: false,
					force: true,
				},
				{
					type: "add",
					path: `${directory}/src/index.ts`,
					template: `export * from "./${answers.name}";\n`,
					skipIfExists: true,
				},
				{
					type: "add",
					path: `${directory}/src/${answers.name}/index.ts`,
					template: "export {};\n",
					skipIfExists: true,
				},
				{
					type: "add",
					path: `${directory}/__tests__/${answers.name}.test.ts`,
					template: buildModuleTest(answers.category, answers.name),
					skipIfExists: true,
				},
				{
					type: "add",
					path: `${directory}/README.md`,
					template: `# \`${packageName}\`\n\n${answers.longDescription || "..."}`,
					skipIfExists: true,
				},
				{
					type: "runCommand",
					command: `pnpm --filter ${packageName} add ${workspaceDevDependencies.join(" ")} -D --workspace`,
				},
			];
			const finalCmds = [
				`syncpack fix --source-mode replace --source "${directory}/package.json"`,
				`syncpack format --source-mode replace --source "${directory}/package.json"`,
				`prettier --write "${directory}"`,
			];
			for (const command of finalCmds) {
				actions.push({ type: "runCommand", command });
			}

			return actions;
		},
	});
}

declare module "plop" {
	interface ActionConfig {
		command?: string;
	}
}
