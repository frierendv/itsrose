import { apiKeyClient } from "@better-auth/api-key/client";
import { passkeyClient } from "@better-auth/passkey/client";
import type { BetterAuthClientOptions } from "better-auth";
import { betterAuthLocalizationClientPlugin } from "better-auth-localization";
import { createAuthClient } from "better-auth/client";
import {
	adminClient,
	inferAdditionalFields,
	multiSessionClient,
	oauthPopupClient,
} from "better-auth/client/plugins";
import type { AuthServer } from "./server";

export const getBetterAuthClientPlugins = () => [
	passkeyClient(),
	adminClient(),
	multiSessionClient(),
	betterAuthLocalizationClientPlugin(),
	oauthPopupClient(),
	apiKeyClient(),
];

export const betterAuthClientPlugins = getBetterAuthClientPlugins();

export const createBetterAuthClient = <Option extends BetterAuthClientOptions>(
	overrides: Partial<Option> = {}
) => {
	const plugins = [
		...getBetterAuthClientPlugins(),
		...(overrides?.plugins ?? []),
		inferAdditionalFields<AuthServer>(),
	];

	return createAuthClient({
		basePath: "/api",
		...overrides,
		plugins,
	} satisfies BetterAuthClientOptions);
};
