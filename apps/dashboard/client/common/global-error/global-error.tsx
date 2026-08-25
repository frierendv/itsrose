"use client";

import NextError from "next/error";
import { useEffect } from "react";

export type GlobalErrorProps = {
	error: Error & { digest?: string };
};
export const GlobalError = ({ error }: GlobalErrorProps) => {
	useEffect(() => {
		console.error("Global error caught:", error);
	}, [error]);

	return (
		<html>
			<body>
				<NextError statusCode={0} />
			</body>
		</html>
	);
};
