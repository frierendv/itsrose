import type { Viewport } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/providers/auth";
import { BaseProvider } from "@/providers/base";

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "white" },
		{ media: "(prefers-color-scheme: dark)", color: "black" },
	],
	viewportFit: "cover",
	width: "device-width",
	initialScale: 1,
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-svh bg-background antialiased">
				<BaseProvider>
					<AuthProvider>{children}</AuthProvider>
				</BaseProvider>
			</body>
		</html>
	);
}
export { generateMetadata } from "./metadata";
