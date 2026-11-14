import { config } from "@itsrose/standard/eslint/base";

export default [
	...config,
	{
		rules: {
			// The test environment sets the credentials of the upstream clients
			// so that the route module can be imported. Their values are never
			// used.
			"turbo/no-undeclared-env-vars": [
				"warn",
				{ allowList: ["^(CAI|ELEVENLABS|MTXX|REMINI|TIKTOK)_"] },
			],
		},
	},
];
