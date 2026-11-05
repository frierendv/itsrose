import { Suspense } from "react";

/**
 * Admin pages read view state with `useSearchParams`.
 *
 * Next requires a Suspense boundary above client hooks that read URL data, so
 * the whole admin subtree gets one and the shell can still prerender.
 */
export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <Suspense fallback={<AdminLayoutFallback />}>{children}</Suspense>;
}

function AdminLayoutFallback() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-2">
				<div className="h-8 w-64 animate-pulse rounded-md bg-foreground/10" />
				<div className="h-4 w-96 animate-pulse rounded-md bg-foreground/10" />
			</div>
			<div className="h-64 w-full animate-pulse rounded-md bg-foreground/10" />
		</div>
	);
}
