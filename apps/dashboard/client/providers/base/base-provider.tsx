"use client";

import {
	DEFAULT_WEB_SETTING,
	useHydratedWebSetting,
} from "@/shared/web-setting";
import type { PropsWithChildren } from "react";
import { ProgressProvider } from "./bprogress-provider";
import { HeroUIProvider } from "./heroui-provider";
import { ThemeProvider } from "./theme-provider";

export const BaseProvider = ({ children }: PropsWithChildren) => {
	// s -> state; Get all state fallback to DEFAULT_WEB_SETTINGS
	const state = useHydratedWebSetting((s) => s) || DEFAULT_WEB_SETTING;

	return (
		<ProgressProvider {...state.progress}>
			<ThemeProvider {...state.theme}>
				{children}
				<HeroUIProvider toast={state.toast} />
			</ThemeProvider>
		</ProgressProvider>
	);
};
