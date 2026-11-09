import { config } from "@itsrose/standard/eslint/base";

export default [
	...config,
	{
		rules: {
			// Sandbox credentials are read directly by the fixture tooling and
			// the client-surface tests. They are not part of any turbo task.
			"turbo/no-undeclared-env-vars": [
				"warn",
				{ allowList: ["^MIDTRANS_"] },
			],
		},
	},
];
