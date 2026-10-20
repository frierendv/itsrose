import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		title: "Account",
		description: "Manage your ItsRose account.",
	};
};
