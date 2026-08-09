import { apiKeyClient } from "@better-auth/api-key/client";
import type { BetterAuthClientOptions } from "@better-auth/core";
import { passkeyClient } from "@better-auth/passkey/client";
import { betterAuthLocalizationClientPlugin } from "better-auth-localization";
import {
	adminClient,
	inferAdditionalFields,
	multiSessionClient,
	oauthPopupClient,
} from "better-auth/client/plugins";
import type { createAuthServer } from "./server";

export const betterAuthClientPlugins = [
	passkeyClient(),
	adminClient(),
	multiSessionClient(),
	betterAuthLocalizationClientPlugin(),
	oauthPopupClient(),
	apiKeyClient(),
];

export const createAuthClientOptions = <T extends BetterAuthClientOptions>(
	overrides?: Partial<T> | undefined
) => {
	const plugins = betterAuthClientPlugins;
	if (overrides?.plugins) {
		plugins.push(...(overrides.plugins as any));
	}
	return {
		basePath: "/api",
		...overrides,
		plugins: [
			...plugins,
			inferAdditionalFields<ReturnType<typeof createAuthServer>>(),
		],
	};
};
