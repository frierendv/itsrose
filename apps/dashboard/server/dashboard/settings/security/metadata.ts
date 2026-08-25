import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Security",
		description: "Manage your ItsRose account security.",
	};
};
