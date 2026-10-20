import { config } from "@/config/site";
import type { MetadataRoute } from "next";

export default async (): Promise<MetadataRoute.Manifest> => {
	return {
		name: config.appName,
		short_name: config.appName.toLowerCase(),
		description: config.appDescription,
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
		display: "fullscreen",
		display_override: ["standalone", "minimal-ui"],
		categories: ["productivity", "business"],
		orientation: "portrait",
	};
};
