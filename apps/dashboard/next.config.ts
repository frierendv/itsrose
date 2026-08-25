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
			// icon
			"@gravity-ui/icons",
			// react
			"@heroui/react",
			"@heroui/styles",
			// react
			"@better-auth-ui/core",
			"@better-auth-ui/heroui",
			"@better-auth-ui/react",
		],
		turbopackRustReactCompiler: true,
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
};
const withMDX = createMDX({
	extension: /\.(md|mdx)$/,
	options: {
		remarkPlugins: ["remark-gfm", "remark-toc"],
		rehypePlugins: ["rehype-slug"],
	},
});
export default withMDX(nextConfig);
