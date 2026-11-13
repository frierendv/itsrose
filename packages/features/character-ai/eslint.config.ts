import { config, snakeCasePayloadConfig } from "@itsrose/standard/eslint/base";

export default [
	...config,
	...snakeCasePayloadConfig,
	{
		/*
		 * Character.ai returns these three fields with a double underscore in
		 * the upstream payload (`user__username`, `participant__name`,
		 * `participant__num_interactions`). The names are dictated by the
		 * upstream API, which we do not own, so they are excluded explicitly
		 * instead of being renamed on our side.
		 */
		files: ["src/zod-schema/character/character-info.ts"],
		rules: {
			"@itsrose/snake-case-payload": [
				"error",
				{
					allow: [
						"user__username",
						"participant__name",
						"participant__num_interactions",
					],
				},
			],
		},
	},
];
