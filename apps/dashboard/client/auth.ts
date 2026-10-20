import { config } from "@/config";
import { tokenStore } from "@/store/token-store";
import {
	createBetterAuthClient,
	type BetterAuthClient,
} from "@itsrose/auth/react";

export const authClient = createBetterAuthClient({
	baseURL: config.AUTH_BASE_URL,
	// baseURL: "http://localhost:3001",
	basePath: "/auth",
	fetchOptions: {
		// Required for cross-origin cookie storage
		credentials: "include",
		onSuccess: (context) => {
			const authToken = context.response.headers.get("set-auth-token");
			if (authToken) {
				tokenStore.getState().setToken(authToken);
			}
		},
	},
}) as BetterAuthClient;
