import { config } from "@/config";
import {
	createBetterAuthClient,
	type BetterAuthClient,
} from "@itsrose/auth/react";

export const authClient = createBetterAuthClient({
	baseURL: config.AUTH_BASE_URL,
	basePath: "/auth",
	fetchOptions: {
		credentials: "include",
	},
}) as BetterAuthClient;
