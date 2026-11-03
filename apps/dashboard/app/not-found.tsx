import { buttonVariants, Typography } from "@heroui/react";
import type { Metadata } from "next";
import NextLink from "next/link";

export const metadata: Metadata = {
	title: "404 - Page not found",
	description: "The page you are looking for does not exist.",
};

export default function NotFoundPage() {
	return (
		<div className="flex flex-col items-center justify-center min-h-svh p-6 text-center">
			<Typography type="h1" className="font-extrabold tracking-tight">
				404
			</Typography>
			<Typography type="h3" className="mt-2 font-semibold">
				Page not found
			</Typography>
			<Typography type="body-sm" color="muted" className="mt-2 max-w-sm">
				The page you are looking for does not exist or has been moved.
			</Typography>
			<NextLink
				href="/"
				className={buttonVariants({
					variant: "primary",
					size: "md",
					className: "mt-6",
				})}
			>
				Return to Dashboard
			</NextLink>
		</div>
	);
}
