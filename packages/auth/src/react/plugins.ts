import { apiKeyClient } from "@better-auth/api-key/client";
import { dashClient } from "@better-auth/infra/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { creemClient } from "@creem_io/better-auth/client";
import type { BetterAuthClientPlugin } from "better-auth";
import {
	adminClient,
	multiSessionClient,
	oauthPopupClient,
} from "better-auth/client/plugins";

// getBetterAuthClientPlugins
export default function () {
	return [
		passkeyClient(),
		adminClient(),
		multiSessionClient(),
		apiKeyClient(),
		creemClient(),
		oauthPopupClient(),
		dashClient(),
	] satisfies BetterAuthClientPlugin[];
}
