import { config } from "@itsrose/standard/eslint/base";

const BETTER_AUTH_MESSAGE =
	"Architecture violation: the domain layer must not depend on Better Auth. Define a port in src/domain/ports.ts and implement it under src/adapter/*.";
const ADAPTER_MESSAGE =
	"Architecture violation: the domain layer must not import concrete adapter implementations. Depend on a port from src/domain/ports.ts.";
const PLUGIN_MESSAGE =
	"Architecture violation: the domain layer must not import the Better Auth transport/plugin layer.";
const CLIENT_FROM_DOMAIN_MESSAGE =
	"Architecture violation: the domain layer must not import client helpers. Keep domain rules framework-agnostic.";
const CLIENT_BETTER_AUTH_MESSAGE =
	"Architecture violation: client modules must not import Better Auth server APIs. Use client-safe types/helpers only.";
const CLIENT_ADAPTER_MESSAGE =
	"Architecture violation: client modules must not import persistence adapters.";
const CLIENT_SERVER_PLUGIN_MESSAGE =
	"Architecture violation: client modules must not import the server plugin.";

export default [
	...config,
	{
		files: ["src/domain/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["better-auth", "better-auth/*"],
							message: BETTER_AUTH_MESSAGE,
						},
						{
							group: [
								"../adapter",
								"../adapter/*",
								"../../adapter",
								"../../adapter/*",
								"**/adapter/**",
							],
							message: ADAPTER_MESSAGE,
						},
						{
							group: [
								"../plugin",
								"../plugin/*",
								"../../plugin",
								"../../plugin/*",
								"**/plugin/**",
							],
							message: PLUGIN_MESSAGE,
						},
						{
							group: [
								"../client",
								"../client/*",
								"../../client",
								"../../client/*",
								"**/client/**",
							],
							message: CLIENT_FROM_DOMAIN_MESSAGE,
						},
					],
				},
			],
		},
	},
	{
		files: ["src/client/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group: ["better-auth", "better-auth/*"],
							message: CLIENT_BETTER_AUTH_MESSAGE,
						},
						{
							group: [
								"../adapter",
								"../adapter/*",
								"../../adapter",
								"../../adapter/*",
								"**/adapter/**",
							],
							message: CLIENT_ADAPTER_MESSAGE,
						},
						{
							group: [
								"../plugin/plugin-server",
								"../plugin/plugin-server/*",
								"../../plugin/plugin-server",
								"../../plugin/plugin-server/*",
								"**/plugin/plugin-server*",
							],
							message: CLIENT_SERVER_PLUGIN_MESSAGE,
						},
						{
							group: [
								"../server",
								"../server/*",
								"../../server",
								"../../server/*",
							],
							message: CLIENT_SERVER_PLUGIN_MESSAGE,
						},
					],
				},
			],
		},
	},
];
