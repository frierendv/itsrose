import {
	createBetterAuthClient,
	type BetterAuthClient,
} from "@itsrose/auth/react";
import { config } from "../config";

export const authClient: BetterAuthClient = createBetterAuthClient({
	baseURL: config.AUTH_BASE_URL,
	// baseURL: "http://localhost:3001",
	basePath: "/api",
	fetchOptions: {
		// Required for cross-origin cookie storage
		credentials: "include",
	},
}) as unknown as BetterAuthClient;
