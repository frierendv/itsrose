import type { PropsWithChildren } from "react";
import { AuthProvider } from "./auth";
import { BaseProvider } from "./base";

export const Provider: React.FC<PropsWithChildren> = ({ children }) => (
	<BaseProvider>
		<AuthProvider>{children}</AuthProvider>
	</BaseProvider>
);
Provider.displayName = "Provider";
