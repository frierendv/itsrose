import path from "path";
import createMDX from "@next/mdx";
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
	images: {},
	reactStrictMode: true,
	compiler: {
		removeConsole: env.isProd,
		reactRemoveProperties: { properties: ["data-testid"] },
		styledComponents: false,
	},
	productionBrowserSourceMaps: false,
	poweredByHeader: false,
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
			// icon
			"@gravity-ui/icons",
			// react
			"@heroui/react",
			"@heroui/styles",
			"@itsrose/react",
		],
		turbopackRustReactCompiler: true,
		// test
		transitionIndicator: true,
		gestureTransition: true,
		turbopackRemoveUnusedImports: true,
		turbopackRemoveUnusedExports: true,
		mdxRs: true,
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
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};
const withMDX = createMDX({
	extension: /\.(md|mdx)$/,
	options: {
		remarkPlugins: ["remark-gfm", "remark-toc"],
		rehypePlugins: ["rehype-slug"],
	},
});
export default withMDX(nextConfig);
