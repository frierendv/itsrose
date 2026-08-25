import { config } from "@/shared/config";
import type { MetadataRoute } from "next";

export default async (): Promise<MetadataRoute.Robots> => {
	return {
		rules: [
			{
				userAgent: ["*"],
				allow: ["/"],
				disallow: [
					"/api/",
					"/sw.js",
					"/_next/",
					"/_static/",
					"/firebase-messaging-sw.js",
				],
			},
		],
		sitemap: `${config.APP_BASE_URL.href}/sitemap.xml`,
	};
};
