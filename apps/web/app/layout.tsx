import "@/styles/globals.css";
import { HeroUIProvider, ProgressProvider, ThemeProvider } from "@/providers";
import type { Viewport } from "next";
import type { PropsWithChildren } from "react";

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
	viewportFit: "cover",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({ children }: PropsWithChildren) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-svh bg-background antialiased">
				<ProgressProvider>
					<ThemeProvider>
						<HeroUIProvider>{children}</HeroUIProvider>
					</ThemeProvider>
				</ProgressProvider>
			</body>
		</html>
	);
}

export { generateMetadata } from "./metadata";
