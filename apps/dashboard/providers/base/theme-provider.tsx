"use client";

import {
	ThemeProvider as NextThemesProvider,
	type ThemeProviderProps as NextThemeProviderProps,
} from "next-themes";
import type { PropsWithChildren } from "react";

export type ThemeProviderProps = PropsWithChildren<NextThemeProviderProps>;
/**
 * Should be used in `base-provider`
 */
export const ThemeProvider = ({ children, ...props }: ThemeProviderProps) => {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableColorScheme
			enableSystem
			{...props}
		>
			{children}
		</NextThemesProvider>
	);
};
