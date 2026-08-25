"use client";

import {
	authClient,
	creemBillingAdapter,
	getQueryClient,
} from "@/shared/client";
import { config } from "@/shared/config";
import { AuthProvider as BetterAuthUIProvider } from "@better-auth-ui/heroui";
import {
	adminPlugin,
	apiKeyPlugin,
	billingPlugin,
	dashPlugin,
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
				redirectTo="/dashboard"
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
					billingPlugin({ adapter: creemBillingAdapter }),
				]}
				basePaths={{
					auth: "",
					admin: "/dashboard/admin",
					settings: "/dashboard/settings",
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
}
