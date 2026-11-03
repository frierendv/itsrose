"use client";

import { config } from "@/config";
import { authClient } from "@/lib/auth";
import { getQueryClient } from "@/lib/query-client";
import { AuthProvider as BetterAuthUIProvider } from "@better-auth-ui/heroui";
import {
	adminPlugin,
	apiKeyPlugin,
	dashPlugin,
	deleteUserPlugin,
	lastLoginMethodPlugin,
	passkeyPlugin,
} from "@better-auth-ui/heroui/plugins";
import { useRouter } from "@bprogress/next";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";

export const AuthProvider: React.FC<PropsWithChildren> = ({
	children,
}: PropsWithChildren) => {
	const router = useRouter();
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			<BetterAuthUIProvider
				authClient={authClient}
				baseURL={config.APP_BASE_URL.origin}
				socialProviders={["google", "github"]}
				// socialSignInMode="popup"
				navigate={({ to, replace }) =>
					replace ? router.replace(to) : router.push(to)
				}
				multipleAccountsPerProvider={false}
				emailAndPassword={{
					enabled: true,
					rememberMe: true,
					forgotPassword: true,
					confirmPassword: true,
					requireEmailVerification: true,
				}}
				plugins={[
					passkeyPlugin(),
					apiKeyPlugin(),
					adminPlugin({
						// impersonationRedirectTo: "/dashboard",
						defaultRole: "user",
						roles: ["user", "admin"],
					}),
					dashPlugin({ pageSize: 6 }),
					deleteUserPlugin({ sendDeleteAccountVerification: true }),
					lastLoginMethodPlugin(),
				]}
				basePaths={{
					auth: "",
					admin: "/admin",
					settings: "/account",
				}}
				viewPaths={{
					settings: {
						// just ensure to be default
						account: "account",
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
};
