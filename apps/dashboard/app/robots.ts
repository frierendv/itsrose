import { config } from "@/config";
import type { MetadataRoute } from "next";

export default async (): Promise<MetadataRoute.Robots> => {
	return {
		rules: [
			{
				userAgent: ["*"],
				allow: ["/"],
				disallow: ["/api/", "/_next/", "/_static/"],
			},
		],
		sitemap: `${config.APP_BASE_URL.href}/sitemap.xml`,
	};
};
