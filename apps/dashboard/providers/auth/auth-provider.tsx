"use client";

import { authClient } from "@/client/auth";
import { getQueryClient } from "@/client/query";
import { config } from "@/config";
import { AuthProvider as BetterAuthUIProvider } from "@better-auth-ui/heroui";
import {
	adminPlugin,
	apiKeyPlugin,
	dashPlugin,
	deleteUserPlugin,
	multiSessionPlugin,
	passkeyPlugin,
} from "@better-auth-ui/heroui/plugins";
import { useRouter } from "@bprogress/next";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";

export function AuthProvider({ children }: PropsWithChildren) {
	const router = useRouter();
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<BetterAuthUIProvider
				baseURL={config.AUTH_BASE_URL}
				authClient={authClient}
				redirectTo="/"
				socialProviders={["google", "github"]}
				socialSignInMode="popup"
				navigate={({ to, replace }) =>
					replace ? router.replace(to) : router.push(to)
				}
				multipleAccountsPerProvider={false}
				emailAndPassword={{
					enabled: true,
					rememberMe: true,
					forgotPassword: true,
					confirmPassword: true,
				}}
				plugins={[
					passkeyPlugin(),
					multiSessionPlugin(),
					apiKeyPlugin(),
					adminPlugin({
						// impersonationRedirectTo: "/dashboard",
						defaultRole: "user",
						roles: ["user", "admin"],
					}),
					dashPlugin({ pageSize: 6 }),
					deleteUserPlugin(),
				]}
				basePaths={{
					auth: "",
					admin: "/admin",
					settings: "/account",
				}}
				viewPaths={{
					settings: {
						// just ensure to be default
						account: "",
						security: "security",
						billing: "billing",
					},
				}}
			>
				{children}
			</BetterAuthUIProvider>
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
}
