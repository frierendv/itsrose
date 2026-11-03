import "@/styles/globals.css";
import { Provider } from "@/providers";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="min-h-svh bg-background antialiased">
				<Provider>{children}</Provider>
			</body>
		</html>
	);
}
export { generateMetadata } from "./metadata";
export { viewport } from "./viewport";
