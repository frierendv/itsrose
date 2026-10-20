import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => ({
	title: "Admin - Users",
	description: "Manage user access, roles, and sessions.",
});
