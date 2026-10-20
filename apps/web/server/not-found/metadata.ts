import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => ({
	title: "404 Not found",
	description: "Page that you looking for is not exist.",
});
