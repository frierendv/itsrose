import { type CreemClient } from "@creem_io/better-auth/create-creem-auth-client";
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

		// fucking creem plugin
		inferAdditionalFields({
			user: {
				creemCustomerId: { type: "string", required: false },
				hadTrial: {
					type: "boolean",
					required: false,
					defaultValue: false,
				},
			},
		}),
	];
	const authClient = createAuthClient({
		basePath: "/api",
		plugins,
		...optionsOverrides,
	} satisfies BetterAuthClientOptions);

	return authClient as Omit<typeof authClient, "creem"> & {
		creem: CreemClient;
	};
}
