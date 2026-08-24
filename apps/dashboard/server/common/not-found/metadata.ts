import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "404 - Page not found",
		description: "The page you are looking for does not exist.",
	};
};
