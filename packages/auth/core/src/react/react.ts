import type { BetterAuthClientOptions } from "better-auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { AuthServer } from "../server";
import getBetterAuthClientPlugins from "./plugins";

export default function (
	overrides: Omit<BetterAuthClientOptions, "sessionOptions"> = {}
) {
	const { plugins: pluginsOverrides, ...optionsOverrides } = overrides;
	const plugins = [
		...getBetterAuthClientPlugins(),
		inferAdditionalFields<AuthServer>(),
	];

	return createAuthClient({ plugins, ...optionsOverrides });
}
