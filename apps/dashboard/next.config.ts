import path from "path";
import type { NextConfig } from "next";

const env = {
	isProd: process.env.NODE_ENV === "production",
} as const;

const standaloneConfig: NextConfig = {
	output: "standalone",
	outputFileTracingRoot: path.join(__dirname, "../../"),
	outputFileTracingIncludes: { "*": ["public/**/*", ".next/static/**/*"] },
};
const nextConfig: NextConfig = {
	...standaloneConfig,
	allowedDevOrigins: ["*.itsrose.net"],
	images: {},
	reactStrictMode: true,
	compiler: {
		removeConsole: env.isProd,
		reactRemoveProperties: { properties: ["data-testid"] },
		styledComponents: false,
	},
	productionBrowserSourceMaps: false,
	poweredByHeader: false,
	compress: !env.isProd,
	reactCompiler: {
		compilationMode: "infer",
		panicThreshold: "none",
	},
	logging: {
		fetches: { fullUrl: true },
	},
	experimental: {
		webVitalsAttribution: ["TTFB", "LCP", "CLS"],
		scrollRestoration: true,
		optimizeServerReact: true,
		webpackMemoryOptimizations: true,
		useLightningcss: true,
		cssChunking: true,
		optimizeCss: true,
		optimizePackageImports: [
			"@gravity-ui/icons",
			"@heroui/react",
			"@heroui/styles",
		],
		turbopackRustReactCompiler: true,
	},

	redirects: async () => [
		{
			destination: "/manifest.webmanifest",
			permanent: true,
			source: "/manifest.json",
		},
	],
};

export default nextConfig;
