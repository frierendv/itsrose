import { config, snakeCasePayloadConfig } from "@itsrose/standard/eslint/base";

export default [
	...config,
	...snakeCasePayloadConfig,
	{
		/*
		 * `response-audio-format` is an HTTP header name (kebab-case by HTTP
		 * convention), not a JSON payload key. The schema documents the header
		 * our API reads from the request, so it must keep the header spelling.
		 */
		files: ["src/zod-schema/shared/response.ts"],
		rules: {
			"@itsrose/snake-case-payload": [
				"error",
				{ allow: ["response-audio-format"] },
			],
		},
	},
];
