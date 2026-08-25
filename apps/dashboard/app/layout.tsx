import type { Viewport } from "next";
import "@/styles/globals.css";
import { Provider } from "@/components/provider";
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
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
export { generateMetadata } from "./metadata";
