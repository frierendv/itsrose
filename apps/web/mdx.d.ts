declare module "*.mdx" {
	import type { ComponentType } from "react";
	export const metadata: {
		title?: string;
		description?: string;
		published?: string;
		[key: string]: unknown;
	};
	const MDXContent: ComponentType;
	export default MDXContent;
}
