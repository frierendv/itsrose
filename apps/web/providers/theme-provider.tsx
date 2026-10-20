"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { PropsWithChildren } from "react";

/**
 * Last order
 */
export const ThemeProvider = ({ children }: PropsWithChildren) => {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableColorScheme
			enableSystem
		>
			{children}
		</NextThemesProvider>
	);
};
