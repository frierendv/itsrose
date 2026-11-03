import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import type { BetterAuthClientPlugin } from "better-auth";
import {
	adminClient,
	lastLoginMethodClient,
	multiSessionClient,
	oauthPopupClient,
} from "better-auth/client/plugins";
import { itsRosePluginClient } from "../itsrose/plugin-client";

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
