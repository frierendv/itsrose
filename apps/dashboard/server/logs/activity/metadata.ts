import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Logs Activity",
		description: "Review recent authentication and account activity.",
	};
};
