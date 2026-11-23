import { AudioPlayerProvider } from "@/components/ui/audio-player";
import type { PropsWithChildren } from "react";
import { AuthProvider } from "./auth";
import { BaseProvider } from "./base";

export const Provider: React.FC<PropsWithChildren> = ({ children }) => (
	<BaseProvider>
		<AuthProvider>
			<AudioPlayerProvider>{children}</AudioPlayerProvider>
		</AuthProvider>
	</BaseProvider>
);
Provider.displayName = "Provider";
