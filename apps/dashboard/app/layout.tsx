import type { Viewport } from "next";
import "@/styles/globals.css";
import { BaseProvider } from "@/client/providers/base";

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
	viewportFit: "cover",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-svh bg-background antialiased">
				<BaseProvider>{children}</BaseProvider>
			</body>
		</html>
	);
}
export { generateMetadata } from "./metadata";
