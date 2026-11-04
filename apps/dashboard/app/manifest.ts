import { config } from "@/config";
import { lowerCase } from "@/server/utils";
import type { MetadataRoute } from "next";

export default async (): Promise<MetadataRoute.Manifest> => {
	return {
		name: config.APP_NAME,
		short_name: lowerCase(config.APP_NAME),
		description: config.APP_DESCRIPTION,
		lang: "en",
		dir: "ltr",
		icons: [
			{
				src: "/web-app-manifest-192x192.png",
				sizes: "192x192",
				type: "image/png",
				purpose: "maskable",
			},
			{
				src: "/web-app-manifest-512x512.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		theme_color: "#ffffff",
		background_color: "#ffffff",
		start_url: "/",
		scope: "/",
		display: "standalone",
		display_override: ["standalone", "minimal-ui"],
		categories: ["productivity", "business"],
		orientation: "portrait",
	};
};
