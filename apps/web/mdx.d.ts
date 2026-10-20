declare module "*.mdx" {
	import type { ComponentType } from "react";
	export const metadata: {
		title?: string;
		description?: string;
		published?: string;
		[key: string]: any;
	};
	const MDXContent: ComponentType<any>;
	export default MDXContent;
}
