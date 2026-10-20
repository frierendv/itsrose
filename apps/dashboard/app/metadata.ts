import { config } from "@/config";
import type { Metadata } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
	return {
		applicationName: config.APP_TITLE,
		alternates: {
			canonical: "/",
		},
		title: {
			default: config.APP_NAME,
			template: `%s | ${config.APP_TITLE}`,
		},
		manifest: "/manifest.webmanifest",
		description: "ItsRose provide you an easy to integrate APIs.",
		metadataBase: config.APP_BASE_URL,
		appleWebApp: {
			title: config.APP_TITLE,
			capable: true,
			statusBarStyle: "black-translucent",
		},
		authors: [
			{
				name: config.authors.github.title,
				url: config.authors.github.url,
			},
		],

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
			siteName: config.APP_NAME,
			description: config.APP_DESCRIPTION,
			images: [
				{
					url: "/web-app-manifest-512x512.png",
					width: 512,
					height: 512,
					alt: `${config.APP_NAME} Logo`,
				},
			],
		},
		twitter: {
			card: "summary_large_image",
			title: {
				default: config.APP_NAME,
				template: `%s | ${config.APP_TITLE}`,
			},
			description: config.APP_DESCRIPTION,
			images: [
				{
					url: "/web-app-manifest-512x512.png",
					width: 512,
					height: 512,
					alt: `${config.APP_NAME} Logo`,
				},
			],
		},
		formatDetection: {
			telephone: false,
		},
		keywords: ["ItsRose", "Productivity"],
	};
};
