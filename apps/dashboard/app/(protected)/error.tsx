"use client";

import { Button } from "@heroui/react/button";
import { Typography } from "@heroui/react/typography";
import { useEffect } from "react";

export default function Error({
	error,
	retry,
}: {
	error: Error & { digest?: string };
	retry: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error(error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-100 p-4">
			<div className="max-w-md text-center space-y-4">
				<Typography
					type="h2"
					className="text-2xl font-bold text-danger text-center"
				>
					Something went wrong!
				</Typography>
				<p className="text-default-600">
					An error occurred while processing your request.
				</p>
				<Button variant="primary" onPress={retry}>
					Retry
				</Button>
			</div>
		</div>
	);
}
