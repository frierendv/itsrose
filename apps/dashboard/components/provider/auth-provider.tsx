"use client";

import { config } from "@/shared/config";
import { authClient, getQueryClient } from "@/shared/lib";
import { AuthProvider as BetterAuthUIProvider } from "@better-auth-ui/heroui";
import {
	adminPlugin,
	apiKeyPlugin,
	multiSessionPlugin,
	passkeyPlugin,
} from "@better-auth-ui/heroui/plugins";
import { useRouter } from "@bprogress/next";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

export function BetterAuthProvider({ children }: PropsWithChildren) {
	const router = useRouter();
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<BetterAuthUIProvider
				baseURL={config.AUTH_BASE_URL}
				authClient={authClient}
				redirectTo="/"
				socialProviders={["google", "github"]}
				navigate={({ to, replace }) =>
					replace ? router.replace(to) : router.push(to)
				}
				emailAndPassword={{
					enabled: true,
					rememberMe: true,
					forgotPassword: true,
					confirmPassword: true,
				}}
				plugins={[
					passkeyPlugin(),
					adminPlugin(),
					multiSessionPlugin(),
					apiKeyPlugin(),
				]}
				basePaths={{
					auth: "",
					settings: "/settings",
				}}
				viewPaths={{
					settings: {
						// just ensure to be default
						account: "account",
						security: "security",
					},
				}}
			>
				{children}
			</BetterAuthUIProvider>
		</QueryClientProvider>
	);
}
