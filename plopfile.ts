import { exec } from "node:child_process";
import type { ActionType, NodePlopAPI } from "plop";

export default function (plop: NodePlopAPI) {
	plop.setActionType("runCommand", (answers, config) => {
		const command = config.command as string;
		return new Promise((resolve, reject) => {
			exec(command, (err, stdout, stderr) => {
				if (err) reject(err);
				else resolve(stdout || "Success");
			});
		});
	});

	plop.setGenerator("module", {
		description: "create new packages/module",

		// 1. Convert prompts to an async function to enable looping
		prompts: async (inquirer) => {
			// Step A: Ask the base questions first
			const baseAnswers = await inquirer.prompt([
				{
					type: "list",
					name: "category",
					message: "Select module category: ",
					choices: [
						{ name: "Others", value: "none", checked: true },
						{ name: "Core", value: "core" },
						{ name: "Features", value: "features" },
						{ name: "Internal", value: "internal" },
						{ name: "shared", value: "shared" },
					],
				},
				{
					type: "input",
					name: "name",
					message: "Package name @itsrose/name : ",
				},
				{
					type: "input",
					name: "description",
					message: "Module description (optional):",
				},
			]);

			// Arrays to store dependencies if the user loops multiple times
			const deps: string[] = [];
			const devDeps: string[] = [];

			// Step B: The While Loop
			let addingDependencies = true;
			while (addingDependencies) {
				const { depType } = await inquirer.prompt([
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

				if (depType === "none") {
					addingDependencies = false; // Break the loop
				} else {
					// Ask for the specific package names
					const { packages } = await inquirer.prompt([
						{
							type: "input",
							name: "packages",
							message: `Enter ${depType} (space separated, e.g., zod lodash):`,
						},
					]);

					if (packages.trim()) {
						if (depType === "dependencies")
							deps.push(packages.trim());
						if (depType === "devDependencies")
							devDeps.push(packages.trim());
					}
				}
			}

			// Step C: Return the merged answers to Plop's actions
			return {
				...baseAnswers,
				dependencies: deps.join(" "),
				devDependencies: devDeps.join(" "),
			};
		},

		actions: (answers) => {
			const isNone = answers?.category === "none";

			const destination = isNone
				? "packages/{{name}}"
				: "packages/{{category}}/{{name}}";

			const directory = isNone
				? `packages/${answers!.name}`
				: `packages/${answers!.category}/${answers!.name}`;

			const rootRelativePath = isNone ? "../../" : "../../../";

			const actions: ActionType[] = [
				{
					type: "addMany",
					destination,
					base: "plop-templates/module",
					templateFiles: "plop-templates/module/**/*",
					data: { rootRelativePath, directory },
					globOptions: { dot: true },
				},
				{
					type: "add",
					path: `${destination}/src/{{name}}/index.ts`,
					template: "export {};",
				},
				{ type: "runCommand", command: `npm install` },
			];

			// Because we used array.join(" "), these variables are safe to check
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

			actions.push({ type: "runCommand", command: `npm install` });
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
