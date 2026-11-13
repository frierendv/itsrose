import { config, snakeCasePayloadConfig } from "@itsrose/standard/eslint/base";

export default [
	...config,
	...snakeCasePayloadConfig,
	{
		/*
		 * `wmplay` and `music_info` are field names of the upstream TikWM
		 * response. They are a third-party contract that we do not own, so the
		 * upstream schema keeps them verbatim and is excluded explicitly. The
		 * normalized payload we expose is `snake_case` (see
		 * `src/zod-schema/response.ts`).
		 */
		files: ["src/zod-schema/upstream.ts"],
		rules: {
			"@itsrose/snake-case-payload": [
				"error",
				{ allow: ["wmplay", "music_info"] },
			],
		},
	},
];
