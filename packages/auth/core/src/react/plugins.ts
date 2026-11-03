import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { itsRosePluginClient } from "@itsrose/auth-billing/plugin-client";
import type { BetterAuthClientPlugin } from "better-auth";
import {
	adminClient,
	lastLoginMethodClient,
	oauthPopupClient,
} from "better-auth/client/plugins";

// getBetterAuthClientPlugins
export default function () {
	return [
		passkeyClient(),
		adminClient(),
		apiKeyClient(),
		oauthPopupClient(),
		lastLoginMethodClient(),
		dashClient(),
		itsRosePluginClient(),
	] satisfies BetterAuthClientPlugin[];
}
