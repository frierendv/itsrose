import { config } from "@/config";
import { localization } from "@better-auth-ui/core";
import type { Metadata } from "next";

type Localization = typeof localization;

export function createAuthMetadata<
	BasePath extends keyof Localization,
	AuthPath extends keyof Localization[BasePath],
>(basePath: BasePath, path: AuthPath) {
	let title: string = config.APP_TITLE;
	if (localization[basePath] || localization[basePath][path]) {
		title = localization[basePath][path] as string;
	}
	return async (): Promise<Metadata> => ({
		title,
	});
}
