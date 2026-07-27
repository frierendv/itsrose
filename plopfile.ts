import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ActionType, NodePlopAPI } from "plop";

const execAsync = promisify(exec);

export interface ModuleAnswers {
	category: "others" | "core" | "features" | "internal" | "shared";
	name: string;
	description?: string;
	dependencies?: string;
	devDependencies?: string;
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
			const baseAnswers = await inquirer.prompt<
				Omit<ModuleAnswers, "dependencies" | "devDependencies">
			>([
				{
					type: "list",
					name: "category",
					message: "Select module category: ",
					choices: [
						{ name: "Others", value: "none" },
						{ name: "Core", value: "core" },
						{ name: "Features", value: "features" },
						{ name: "Internal", value: "internal" },
						{ name: "Shared", value: "shared" },
					],
				},
				{
					type: "input",
					name: "name",
					message: "Package name @itsrose/name : ",
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
					name: "description",
					message: "Module description (optional):",
				},
			]);

			const deps = new Set<string>();
			const devDeps = new Set<string>();

			let addingDependencies = true;
			while (addingDependencies) {
				const { depType } = await inquirer.prompt<{
					depType: "none" | "dependencies" | "devDependencies";
				}>([
					{
						type: "list",
						name: "depType",
						message: "Add dependencies to this module?",
						choices: [
							{ name: "No, finish and generate", value: "none" },
							{
								name: "Yes, standard dependencies",
								value: "dependencies",
							},
							{
								name: "Yes, devDependencies",
								value: "devDependencies",
							},
						],
					},
				]);

				const { packages } = await inquirer.prompt<{
					packages: string;
				}>([
					{
						type: "input",
						name: "packages",
						message: `Enter ${depType} (space separated, e.g., zod lodash):`,
					},
				]);

				const items = packages.trim().split(/\s+/).filter(Boolean);
				const targetSet = depType === "dependencies" ? deps : devDeps;
				for (const item of items) {
					targetSet.add(item);
				}
			}

			return {
				...baseAnswers,
				dependencies: Array.from(deps).join(" "),
				devDependencies: Array.from(devDeps).join(" "),
			};
		},

		actions: (data) => {
			const answers = data as ModuleAnswers;

			const destination = "packages/{{category}}/{{name}}";
			const directory = `packages/${answers.category}/${answers.name}`;
			const rootRelativePath = "../../../";

			const actions: ActionType[] = [
				{
					type: "addMany",
					destination,
					base: "plop-templates/module",
					templateFiles: "plop-templates/module/**/*",
					data: { rootRelativePath, directory },
					globOptions: { dot: true },
					skipIfExists: true,
				},
				{
					type: "add",
					path: `${destination}/src/{{name}}/index.ts`,
					template: "export {};",
					skipIfExists: true,
				},
				{ type: "runCommand", command: "npm install" },
			];

			if (answers?.dependencies) {
				actions.push({
					type: "runCommand",
					command: `npm install ${answers.dependencies} -w @itsrose/${answers.name}`,
				});
			}

			if (answers?.devDependencies) {
				actions.push({
					type: "runCommand",
					command: `npm install -D ${answers.devDependencies} -w @itsrose/${answers.name}`,
				});
			}

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
