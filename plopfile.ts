import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ActionType, NodePlopAPI } from "plop";

const execAsync = promisify(exec);

export interface ModuleAnswers {
	category: "others" | "core" | "features" | "internal" | "shared";
	name: string;
	author: string;
	description?: string;
	lognDescription?: string;
}

const scope = "@itsrose";

// resolve lock file not sync after generating module package
const moduleDevDeps = [
	`${scope}/eslint-config@*`,
	`${scope}/tsdown-config@*`,
	`${scope}/typescript-config@*`,
];

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
						if (!name) return "Package name is required.";
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

			const destination = "packages/{{category}}/{{name}}";
			const directory = `packages/${answers.category}/${answers.name}`;
			const rootRelativePath = "../../../";
			const packageName = `${scope}/${answers.name}`;

			const initCmd = [
				`--scope`,
				scope,
				"--init-type",
				"module",
				"--init-license",
				"MIT",
				"--init-author-name",
				answers.author,
				"--workspace",
				directory,
				"--yes",
			];

			const actions: ActionType[] = [
				{
					type: "runCommand",
					command: `npm init ${initCmd.join(" ")}`,
				},
				{
					type: "addMany",
					destination,
					base: "plop-templates/module",
					templateFiles: "plop-templates/module/**/*",
					data: { rootRelativePath, directory },
					globOptions: { dot: true },
					skipIfExists: false,
					force: true,
				},
				{
					type: "add",
					path: `${destination}/src/index.ts`,
					template: `export * from "./${answers.name}";\n`,
					skipIfExists: true,
					abortOnFail: false,
				},
				{
					type: "add",
					path: `${destination}/src/{{name}}/index.ts`,
					template: "export {};\n",
					skipIfExists: true,
					abortOnFail: false,
				},
				{
					type: "add",
					path: `${destination}/__tests__/{{name}}.test.ts`,
					template: `describe("${answers.category}/${answers.name}", () => {\n\n\t/\** test for ${packageName} */\n\n});`,
					skipIfExists: true,
					abortOnFail: false,
				},
				{
					type: "add",
					path: `${destination}/README.md`,
					template: `# \`${packageName}\`\n\n${answers.lognDescription || "..."}`,
					skipIfExists: true,
					abortOnFail: false,
				},
				{
					type: "runCommand",
					command: `npm ci -D ${moduleDevDeps.join(" ")} --workspace ${packageName}`,
				},
			];

			actions.push({
				type: "runCommand",
				command: `syncpack fix; syncpack format; prettier --write --list-different ${directory}`,
			});

			return actions;
		},
	});
}

declare module "plop" {
	interface ActionConfig {
		command?: string;
	}
}
