import { betterAuth, type BetterAuthOptions } from "better-auth";
import type { SharedEnv } from "../shared";
import { getAuthOptions } from "./options";
import getBetterAuthPlugins from "./plugins";

export default function (
	overrides: BetterAuthOptions = {} as BetterAuthOptions
) {
	const env = process.env as unknown as SharedEnv & Record<string, unknown>;
	const baseOptions = getAuthOptions(env);
	const plugins = [
		...getBetterAuthPlugins(env),
		...(overrides?.plugins ?? []),
	];
	return betterAuth({
		...baseOptions,
		...overrides,
		emailAndPassword: {
			...baseOptions.emailAndPassword,
			...overrides.emailAndPassword,
		},
		advanced: {
			...baseOptions.advanced,
			...overrides.advanced,
		},
		telemetry: {
			enabled: env.NODE_ENV !== "production",
		},
		plugins,
	});
}
