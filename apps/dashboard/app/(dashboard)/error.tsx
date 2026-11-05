"use client";

import { Button, Typography } from "@heroui/react";
import { useEffect } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Dashboard route error caught:", error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-100 p-6 text-center">
			<div className="max-w-md flex flex-col items-center gap-4">
				<Typography
					type="h2"
					className="text-2xl font-bold text-danger"
				>
					Something went wrong
				</Typography>
				<Typography type="body-sm" color="muted">
					An error occurred while processing this page.
				</Typography>
				<Button variant="primary" onPress={reset}>
					Try again
				</Button>
			</div>
		</div>
	);
}
