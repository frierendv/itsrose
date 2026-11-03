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

const devConfig: NextConfig = !env.isProd
	? { allowedDevOrigins: ["*.itsrose.my.id"] }
	: {};

const nextConfig: NextConfig = {
	...standaloneConfig,
	...devConfig,
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
		gestureTransition: true,
		scrollRestoration: true,
		optimizeServerReact: true,
		webpackMemoryOptimizations: true,
		useLightningcss: true,
		cssChunking: true,
		optimizeCss: true,
		optimizePackageImports: [
			// icon
			"@gravity-ui/icons",
			// react
			"@heroui/react",
			"@heroui/styles",
			// react
			"@better-auth-ui/core",
			"@better-auth-ui/heroui",
			"@better-auth-ui/react",
			"@itsrose/react",
		],
		// test
		transitionIndicator: true,
		turbopackRustReactCompiler: true,
		turbopackRemoveUnusedImports: true,
		turbopackRemoveUnusedExports: true,
	},
	transpilePackages: ["@itsrose/react"],

	redirects: async () => [
		{
			destination: "/manifest.webmanifest",
			permanent: true,
			source: "/manifest.json",
		},
	],
	devIndicators: false,
	pageExtensions: ["ts", "tsx", "md", "mdx"],
	cacheComponents: true,
	partialPrefetching: true,
	turbopack: {
		rules: {
			"*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
		},
	},
};
export default nextConfig;
