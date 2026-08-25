import { config } from "@/shared/config";
import type { MetadataRoute } from "next";

export default async (): Promise<MetadataRoute.Sitemap> => {
	return [
		{
			url: config.APP_BASE_URL.href,
			changeFrequency: "daily",
		},
	];
};
