"use client";

import { useStoreWebSetting } from "@/shared/web-setting";
import { ProgressProvider } from "@bprogress/next/app";
import { ToastProvider } from "@heroui/react/toast";
import { ThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { BetterAuthProvider } from "./auth-provider";

export const Provider = ({ children }: PropsWithChildren) => {
	const { progress, toast, theme } = useStoreWebSetting();
	return (
		<ProgressProvider
			color="#FF66CC"
			spinnerPosition="top-right"
			{...progress}
			options={{
				positionUsing: "translate3d",
				direction: "ltr",
				...progress.options,
				indeterminate: true,
			}}
			shallowRouting
			memo
			disableAnchorClick
			disableSameURL
		>
			<ThemeProvider
				attribute={["class", "data-theme"]}
				disableTransitionOnChange
				{...theme}
			>
				<BetterAuthProvider>{children}</BetterAuthProvider>
				<ToastProvider {...toast} />
			</ThemeProvider>
		</ProgressProvider>
	);
};
