import { config } from "@/config/site";
import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		applicationName: config.appName,
		alternates: {
			canonical: "/",
		},
		title: {
			default: config.appName,
			template: `%s | ${config.appName}`,
		},
		manifest: "/manifest.webmanifest",
		description: "ItsRose provide you an easy to integrate APIs.",
		// metadataBase: config.APP_BASE_URL,
		appleWebApp: {
			title: config.appName,
			capable: true,
			statusBarStyle: "black-translucent",
		},
		authors: [{ name: "xct007", url: "https://github.com/xct007" }],

		robots: {
			index: true,
			follow: true,
			googleBot: {
				index: true,
				follow: true,
				"max-video-preview": -1,
				"max-image-preview": "large",
				"max-snippet": -1,
			},
		},
		openGraph: {
			type: "website",
			locale: "en_GB",
			siteName: config.appName,
			description: config.appDescription,
			images: [
				{
					url: "/web-app-manifest-512x512.png",
					width: 512,
					height: 512,
					alt: `${config.appName} Logo`,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: {
				default: config.appName,
				template: `%s | ${config.appName}`,
			},
			description: config.appDescription,
			images: [
				{
					url: "/web-app-manifest-512x512.png",
					width: 512,
					height: 512,
					alt: `${config.appName} Logo`,
				},
			],
		},
		formatDetection: { telephone: false },
		keywords: ["ItsRose", "Productivity"],
	};
};
